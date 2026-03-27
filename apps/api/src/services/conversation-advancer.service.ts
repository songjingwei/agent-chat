import type { PromptMemoryItem } from "@agent/runtime";
import type { AdvanceConversationJobData } from "@agent/shared";

import type { ChatMessage, Session } from "./types.js";
import type { MessageService } from "./message.service.js";
import type { PersonaService } from "./persona.service.js";
import type { RuntimeService } from "./runtime.service.js";
import type { SessionService } from "./session.service.js";

export type AdvanceResult =
  | { action: "continue"; nextJob: AdvanceConversationJobData }
  | { action: "completed"; reason: string }
  | { action: "skipped"; reason: string };

export interface AdvanceDeps {
  sessionService: SessionService;
  messageService: MessageService;
  personaService: PersonaService;
  runtimeService: RuntimeService;
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

export async function advanceConversation(
  job: AdvanceConversationJobData,
  deps: AdvanceDeps,
): Promise<AdvanceResult> {
  const session = await deps.sessionService.getById(job.sessionId);
  if (!session || session.status === "completed") {
    return { action: "skipped", reason: "session_not_found_or_completed" };
  }

  if (session.currentRound >= session.maxRounds) {
    await deps.sessionService.updateStatus(session.id, "completed");
    return { action: "completed", reason: "max_rounds_reached" };
  }

  const [initiatorPersona, targetPersona] = await Promise.all([
    deps.personaService.getById(session.initiatorPersonaId),
    deps.personaService.getById(session.targetPersonaId),
  ]);
  if (!initiatorPersona || !targetPersona) {
    return { action: "skipped", reason: "personas_not_found" };
  }

  const allMessages = await deps.messageService.listBySession(session.id);
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
  const turnResult = await deps.runtimeService.generateTurn({
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

  const sessionAfterModel = await deps.sessionService.getById(session.id);
  if (!sessionAfterModel || sessionAfterModel.status === "completed") {
    return { action: "skipped", reason: "session_completed_during_generation" };
  }

  await deps.messageService.createAgentMessage({
    sessionId: session.id,
    authorPersonaId: speakerPersona.id,
    content: turnResult.message.content,
    metadata: {
      runtime: {
        status: turnResult.status,
        attempts: turnResult.attempts,
        usedFallback: turnResult.usedFallback,
        failureCode: turnResult.failureCode,
        failureDiagnostics: turnResult.failureDiagnostics,
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

  const updatedSession = await deps.sessionService.incrementRound(session.id);

  if (turnResult.status === "fallback") {
    await deps.sessionService.updateStatus(session.id, "paused");
    return { action: "completed", reason: "fallback_paused" };
  }

  const isAwaitingFarewellReply =
    pendingFarewell?.awaitingPersonaId === speakerPersona.id;
  if (isAwaitingFarewellReply && turnResult.message.shouldEndSession) {
    await deps.messageService.createSystemMessage({
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
    await deps.sessionService.updateStatus(session.id, "completed");
    return { action: "completed", reason: "farewell_completed" };
  }

  if (!pendingFarewell && turnResult.message.shouldEndSession) {
    await deps.messageService.createSystemMessage({
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
    return {
      action: "continue",
      nextJob: {
        sessionId: session.id,
        trigger: "system_resume",
        requestedSpeakerPersonaId: counterpartPersona.id,
      },
    };
  }

  if (updatedSession.currentRound >= updatedSession.maxRounds) {
    await deps.sessionService.updateStatus(session.id, "completed");
    return { action: "completed", reason: "max_rounds_after_increment" };
  }

  const sessionBeforeRequeue = await deps.sessionService.getById(session.id);
  if (!sessionBeforeRequeue || sessionBeforeRequeue.status === "completed") {
    return { action: "skipped", reason: "session_completed_before_continue" };
  }

  return {
    action: "continue",
    nextJob: {
      sessionId: session.id,
      trigger: "system_resume",
    },
  };
}
