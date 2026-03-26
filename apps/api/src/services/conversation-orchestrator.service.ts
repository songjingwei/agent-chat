import type { PromptMemoryItem } from "@agent/runtime";

import type { ChatMessage, Session } from "./types.js";
import { MessageService } from "./message.service.js";
import { PersonaService } from "./persona.service.js";
import { RuntimeService } from "./runtime.service.js";
import { SessionService } from "./session.service.js";

type AdvanceTrigger = "session_created" | "human_message" | "system_resume";

export interface AdvanceConversationJob {
  sessionId: string;
  trigger: AdvanceTrigger;
  requestedSpeakerPersonaId?: string | undefined;
}

export interface ConversationOrchestrator {
  enqueueAdvance(job: AdvanceConversationJob): void;
  cancelSession(sessionId: string): void;
}

interface FarewellPendingState {
  proposedByPersonaId: string;
  awaitingPersonaId: string;
}

const FAREWELL_PROPOSED_KIND = "farewell_proposed";
const FAREWELL_COMPLETED_KIND = "farewell_completed";
const MAX_PROMPT_MESSAGES = 24;

const isParticipant = (session: Session, personaId: string): boolean => {
  return (
    session.initiatorPersonaId === personaId ||
    session.targetPersonaId === personaId
  );
};

const resolveFallbackAuthorName = (
  session: Session,
  message: ChatMessage,
  initiatorName: string,
  targetName: string,
) => {
  if (message.authorPersonaId === session.initiatorPersonaId) {
    return initiatorName;
  }
  if (message.authorPersonaId === session.targetPersonaId) {
    return targetName;
  }
  return message.authorPersonaId;
};

const extractFarewellPending = (
  messages: ChatMessage[],
): FarewellPendingState | null => {
  let pending: FarewellPendingState | null = null;

  for (const message of messages) {
    if (message.role !== "system" || !message.metadata) {
      continue;
    }

    const orchestratorMeta = (message.metadata.orchestrator ??
      undefined) as Record<string, unknown> | undefined;
    if (!orchestratorMeta) {
      continue;
    }

    const kind =
      typeof orchestratorMeta.kind === "string" ? orchestratorMeta.kind : undefined;
    if (kind === FAREWELL_PROPOSED_KIND) {
      const proposedByPersonaId =
        typeof orchestratorMeta.proposedByPersonaId === "string"
          ? orchestratorMeta.proposedByPersonaId
          : undefined;
      const awaitingPersonaId =
        typeof orchestratorMeta.awaitingPersonaId === "string"
          ? orchestratorMeta.awaitingPersonaId
          : undefined;
      if (proposedByPersonaId && awaitingPersonaId) {
        pending = {
          proposedByPersonaId,
          awaitingPersonaId,
        };
      }
      continue;
    }

    if (kind === FAREWELL_COMPLETED_KIND) {
      pending = null;
    }
  }

  return pending;
};

const buildSessionGoal = (input: {
  session: Session;
  speakerName: string;
  speakerBio?: string | undefined;
  speakerTraits: string[];
  counterpartName: string;
  counterpartBio?: string | undefined;
  counterpartTraits: string[];
  pendingFarewell: FarewellPendingState | null;
  isFirstTurn: boolean;
}): string => {
  const lines = [
    "Mutual briefing is ready for both personas.",
    `You are: ${input.speakerName}`,
    `Your bio: ${input.speakerBio ?? "N/A"}`,
    `Your traits: ${input.speakerTraits.length > 0 ? input.speakerTraits.join(", ") : "N/A"}`,
    `Counterpart: ${input.counterpartName}`,
    `Counterpart bio: ${input.counterpartBio ?? "N/A"}`,
    `Counterpart traits: ${
      input.counterpartTraits.length > 0
        ? input.counterpartTraits.join(", ")
        : "N/A"
    }`,
    "Keep the tone natural and concise.",
  ];

  if (input.isFirstTurn) {
    lines.push("As the initiator, proactively open the conversation.");
  }

  if (input.pendingFarewell) {
    lines.push(
      `The other side already proposed goodbye. If appropriate, respond with a clear goodbye and set shouldEndSession=true.`,
    );
  }

  return lines.join("\n");
};

const buildBriefingMemoryItems = (input: {
  counterpartName: string;
  counterpartBio?: string | undefined;
  counterpartTraits: string[];
  pendingFarewell: FarewellPendingState | null;
}): PromptMemoryItem[] => {
  const traits =
    input.counterpartTraits.length > 0
      ? input.counterpartTraits.join(", ")
      : "N/A";
  const items: PromptMemoryItem[] = [
    {
      category: "fact",
      source: "system",
      weight: 1,
      content: `Counterpart briefing: ${input.counterpartName}; bio=${input.counterpartBio ?? "N/A"}; traits=${traits}.`,
    },
  ];

  if (input.pendingFarewell) {
    items.push({
      category: "instruction",
      source: "system",
      weight: 1,
      content:
        "Conversation is in farewell handshake phase. Reply with a respectful goodbye if you are ready to close.",
    });
  }

  return items;
};

export class InProcessConversationOrchestratorService
  implements ConversationOrchestrator
{
  readonly #messageService: MessageService;
  readonly #sessionService: SessionService;
  readonly #personaService: PersonaService;
  readonly #runtimeService: RuntimeService;

  #isDraining = false;
  readonly #queue: string[] = [];
  readonly #jobsBySessionId = new Map<string, AdvanceConversationJob>();
  readonly #processingSessionIds = new Set<string>();

  constructor(options: {
    messageService: MessageService;
    sessionService: SessionService;
    personaService: PersonaService;
    runtimeService: RuntimeService;
  }) {
    this.#messageService = options.messageService;
    this.#sessionService = options.sessionService;
    this.#personaService = options.personaService;
    this.#runtimeService = options.runtimeService;
  }

  enqueueAdvance(job: AdvanceConversationJob): void {
    const existing = this.#jobsBySessionId.get(job.sessionId);
    if (existing) {
      this.#jobsBySessionId.set(job.sessionId, {
        ...existing,
        ...job,
      });
    } else {
      this.#jobsBySessionId.set(job.sessionId, job);
      this.#queue.push(job.sessionId);
    }

    if (!this.#isDraining) {
      this.#isDraining = true;
      setTimeout(() => {
        void this.#drain();
      }, 0);
    }
  }

  cancelSession(sessionId: string): void {
    this.#jobsBySessionId.delete(sessionId);
    for (let index = this.#queue.length - 1; index >= 0; index -= 1) {
      if (this.#queue[index] === sessionId) {
        this.#queue.splice(index, 1);
      }
    }
  }

  async #drain(): Promise<void> {
    try {
      while (this.#queue.length > 0) {
        const sessionId = this.#queue.shift();
        if (!sessionId) {
          continue;
        }

        const job = this.#jobsBySessionId.get(sessionId);
        this.#jobsBySessionId.delete(sessionId);
        if (!job) {
          continue;
        }

        if (this.#processingSessionIds.has(sessionId)) {
          this.enqueueAdvance(job);
          continue;
        }

        this.#processingSessionIds.add(sessionId);
        try {
          await this.#advanceConversation(job);
        } catch (error) {
          console.error(
            "[orchestrator] advance_failed",
            JSON.stringify({
              sessionId: job.sessionId,
              trigger: job.trigger,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
        } finally {
          this.#processingSessionIds.delete(sessionId);
        }
      }
    } finally {
      this.#isDraining = false;
      if (this.#queue.length > 0) {
        this.#isDraining = true;
        setTimeout(() => {
          void this.#drain();
        }, 0);
      }
    }
  }

  async #advanceConversation(job: AdvanceConversationJob): Promise<void> {
    const session = await this.#sessionService.getById(job.sessionId);
    if (!session || session.status === "completed") {
      return;
    }

    if (session.currentRound >= session.maxRounds) {
      await this.#sessionService.updateStatus(session.id, "completed");
      return;
    }

    const [initiatorPersona, targetPersona] = await Promise.all([
      this.#personaService.getById(session.initiatorPersonaId),
      this.#personaService.getById(session.targetPersonaId),
    ]);
    if (!initiatorPersona || !targetPersona) {
      return;
    }

    const allMessages = await this.#messageService.listBySession(session.id);
    const pendingFarewell = extractFarewellPending(allMessages);

    const conversationalMessages = allMessages.filter((item) => {
      return item.role !== "system";
    });
    const lastConversational = conversationalMessages.at(-1);

    let speakerPersonaId: string;
    if (
      job.requestedSpeakerPersonaId &&
      isParticipant(session, job.requestedSpeakerPersonaId)
    ) {
      speakerPersonaId = job.requestedSpeakerPersonaId;
    } else if (pendingFarewell) {
      speakerPersonaId = pendingFarewell.awaitingPersonaId;
    } else if (!lastConversational) {
      speakerPersonaId = session.initiatorPersonaId;
    } else if (lastConversational.authorPersonaId === session.initiatorPersonaId) {
      speakerPersonaId = session.targetPersonaId;
    } else {
      speakerPersonaId = session.initiatorPersonaId;
    }

    const speakerPersona =
      speakerPersonaId === session.initiatorPersonaId
        ? initiatorPersona
        : targetPersona;
    const counterpartPersona =
      speakerPersona.id === session.initiatorPersonaId
        ? targetPersona
        : initiatorPersona;

    const recentPromptMessages = conversationalMessages
      .slice(-MAX_PROMPT_MESSAGES)
      .map((message) => ({
        role: message.role,
        content: message.content,
        authorName: resolveFallbackAuthorName(
          session,
          message,
          initiatorPersona.displayName,
          targetPersona.displayName,
        ),
      }));

    const isFirstTurn = session.currentRound === 0;
    const turnResult = await this.#runtimeService.generateTurn({
      sessionId: session.id,
      speakerPersona: {
        id: speakerPersona.id,
        name: speakerPersona.displayName,
        bio: speakerPersona.bio,
        traits: speakerPersona.traits,
      },
      counterpartPersona: {
        id: counterpartPersona.id,
        name: counterpartPersona.displayName,
        bio: counterpartPersona.bio,
        traits: counterpartPersona.traits,
      },
      recentMessages: recentPromptMessages,
      memoryItems: buildBriefingMemoryItems({
        counterpartName: counterpartPersona.displayName,
        counterpartBio: counterpartPersona.bio,
        counterpartTraits: counterpartPersona.traits,
        pendingFarewell,
      }),
      sessionGoal: buildSessionGoal({
        session,
        speakerName: speakerPersona.displayName,
        speakerBio: speakerPersona.bio,
        speakerTraits: speakerPersona.traits,
        counterpartName: counterpartPersona.displayName,
        counterpartBio: counterpartPersona.bio,
        counterpartTraits: counterpartPersona.traits,
        pendingFarewell,
        isFirstTurn,
      }),
    });

    const sessionAfterModel = await this.#sessionService.getById(session.id);
    if (!sessionAfterModel || sessionAfterModel.status === "completed") {
      return;
    }

    await this.#messageService.createAgentMessage({
      sessionId: session.id,
      authorPersonaId: speakerPersona.id,
      content: turnResult.message.content,
      metadata: {
        runtime: {
          status: turnResult.status,
          attempts: turnResult.attempts,
          usedFallback: turnResult.usedFallback,
          failureCode: turnResult.failureCode,
          modelMeta: turnResult.modelMeta,
          promptMeta: turnResult.promptMeta,
        },
        orchestrator: {
          trigger: job.trigger,
          speakerPersonaId: speakerPersona.id,
          counterpartPersonaId: counterpartPersona.id,
        },
      },
    });

    const updatedSession = await this.#sessionService.incrementRound(session.id);

    if (turnResult.status === "fallback") {
      await this.#sessionService.updateStatus(session.id, "completed");
      return;
    }

    const isAwaitingFarewellReply =
      pendingFarewell?.awaitingPersonaId === speakerPersona.id;
    if (isAwaitingFarewellReply && turnResult.message.shouldEndSession) {
      await this.#messageService.createSystemMessage({
        sessionId: session.id,
        authorPersonaId: speakerPersona.id,
        content: "[system] farewell handshake completed",
        metadata: {
          orchestrator: {
            kind: FAREWELL_COMPLETED_KIND,
            proposedByPersonaId: pendingFarewell?.proposedByPersonaId,
            completedByPersonaId: speakerPersona.id,
          },
        },
      });
      await this.#sessionService.updateStatus(session.id, "completed");
      return;
    }

    if (!pendingFarewell && turnResult.message.shouldEndSession) {
      await this.#messageService.createSystemMessage({
        sessionId: session.id,
        authorPersonaId: speakerPersona.id,
        content: "[system] farewell proposed",
        metadata: {
          orchestrator: {
            kind: FAREWELL_PROPOSED_KIND,
            proposedByPersonaId: speakerPersona.id,
            awaitingPersonaId: counterpartPersona.id,
          },
        },
      });
      this.enqueueAdvance({
        sessionId: session.id,
        trigger: "system_resume",
        requestedSpeakerPersonaId: counterpartPersona.id,
      });
      return;
    }

    if (updatedSession.currentRound >= updatedSession.maxRounds) {
      await this.#sessionService.updateStatus(session.id, "completed");
      return;
    }

    const sessionBeforeRequeue = await this.#sessionService.getById(session.id);
    if (!sessionBeforeRequeue || sessionBeforeRequeue.status === "completed") {
      return;
    }

    this.enqueueAdvance({
      sessionId: session.id,
      trigger: "system_resume",
    });
  }
}

export class NoopConversationOrchestratorService implements ConversationOrchestrator {
  enqueueAdvance(): void {
    return;
  }

  cancelSession(): void {
    return;
  }
}
