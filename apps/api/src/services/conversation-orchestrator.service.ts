import type { AdvanceConversationJobData } from "@agent/shared";

import { advanceConversation, type AdvanceDeps } from "./conversation-advancer.service.js";
import type { MessageService } from "./message.service.js";
import type { PersonaService } from "./persona.service.js";
import type { RuntimeService } from "./runtime.service.js";
import type { SessionService } from "./session.service.js";

export interface ConversationOrchestrator {
  enqueueAdvance(job: AdvanceConversationJobData): void;
  cancelSession(sessionId: string): void;
  close?(): Promise<void>;
}

export class InProcessConversationOrchestratorService
  implements ConversationOrchestrator
{
  readonly #deps: AdvanceDeps;

  #isDraining = false;
  readonly #queue: string[] = [];
  readonly #jobsBySessionId = new Map<string, AdvanceConversationJobData>();
  readonly #processingSessionIds = new Set<string>();

  constructor(options: {
    messageService: MessageService;
    sessionService: SessionService;
    personaService: PersonaService;
    runtimeService: RuntimeService;
  }) {
    this.#deps = {
      sessionService: options.sessionService,
      messageService: options.messageService,
      personaService: options.personaService,
      runtimeService: options.runtimeService,
    };
  }

  enqueueAdvance(job: AdvanceConversationJobData): void {
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

  async #advanceConversation(job: AdvanceConversationJobData): Promise<void> {
    const result = await advanceConversation(job, this.#deps);

    if (result.action === "continue") {
      this.enqueueAdvance(result.nextJob);
    }
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
