import { Queue } from "bullmq";
import {
  CONVERSATION_QUEUE_NAME,
  type AdvanceConversationJobData,
} from "@agent/shared";

import type { ConversationOrchestrator } from "./conversation-orchestrator.service.js";

interface BullMQOrchestratorOptions {
  redisUrl: string;
  queuePrefix?: string | undefined;
}

export class BullMQConversationOrchestrator implements ConversationOrchestrator {
  readonly #queue: Queue<AdvanceConversationJobData>;

  constructor(options: BullMQOrchestratorOptions) {
    const redisUrl = new URL(options.redisUrl);
    this.#queue = new Queue(CONVERSATION_QUEUE_NAME, {
      connection: {
        host: redisUrl.hostname,
        port: Number(redisUrl.port) || 6379,
        password: redisUrl.password || undefined,
      },
      prefix: options.queuePrefix ?? "agent-chat",
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2_000,
        },
        removeOnComplete: { count: 1000, age: 86_400 },
        removeOnFail: false,
      },
    });
  }

  enqueueAdvance(job: AdvanceConversationJobData): void {
    void this.#queue
      .add(
        `session-${job.sessionId}`,
        job,
        {
          jobId: `advance-${job.sessionId}`,
        },
      )
      .then((bullJob) => {
        console.info(
          "[orchestrator] bullmq_enqueued",
          JSON.stringify({
            jobId: bullJob.id,
            sessionId: job.sessionId,
            trigger: job.trigger,
          }),
        );
      })
      .catch((error) => {
        console.error(
          "[orchestrator] bullmq_enqueue_failed",
          JSON.stringify({
            sessionId: job.sessionId,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      });
  }

  cancelSession(sessionId: string): void {
    const jobId = `advance-${sessionId}`;
    void this.#queue
      .remove(jobId)
      .catch((error) => {
        console.error(
          "[orchestrator] bullmq_cancel_failed",
          JSON.stringify({
            sessionId,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      });
  }

  async close(): Promise<void> {
    await this.#queue.close();
  }
}
