import { Worker, type Job } from "bullmq";
import {
  CONVERSATION_QUEUE_NAME,
  type AdvanceConversationJobData,
  type AdvanceConversationJobProgress,
} from "@agent/shared";
import { advanceConversation, type AdvanceDeps } from "@agent/api/services";

import { redisConnection } from "../queues/connection.js";
import { workerConfig } from "../config.js";

export const createConversationWorker = (
  deps: AdvanceDeps,
): Worker<AdvanceConversationJobData, void, string> => {
  const worker = new Worker<AdvanceConversationJobData>(
    CONVERSATION_QUEUE_NAME,
    async (job: Job<AdvanceConversationJobData>) => {
      let currentJob = job.data;
      let turnCount = 0;
      const startedAt = Date.now();

      console.info(
        "[worker] conversation_started",
        JSON.stringify({
          jobId: job.id,
          sessionId: currentJob.sessionId,
          trigger: currentJob.trigger,
        }),
      );

      while (true) {
        const elapsedMs = Date.now() - startedAt;
        if (elapsedMs >= workerConfig.sessionTimeoutMs) {
          console.warn(
            "[worker] conversation_timeout",
            JSON.stringify({
              jobId: job.id,
              sessionId: currentJob.sessionId,
              turns: turnCount,
              elapsedMs,
            }),
          );

          try {
            const session = await deps.sessionService.getById(currentJob.sessionId);
            if (session && session.status !== "completed") {
              await deps.sessionService.updateStatus(currentJob.sessionId, "paused");
            }
          } catch (error) {
            console.error(
              "[worker] conversation_timeout_pause_failed",
              JSON.stringify({
                jobId: job.id,
                sessionId: currentJob.sessionId,
                error: error instanceof Error ? error.message : String(error),
              }),
            );
          }

          return;
        }

        const result = await advanceConversation(currentJob, deps);

        turnCount += 1;

        if (result.action === "completed") {
          console.info(
            "[worker] conversation_completed",
            JSON.stringify({
              jobId: job.id,
              sessionId: currentJob.sessionId,
              turns: turnCount,
              reason: result.reason,
              elapsedMs: Date.now() - startedAt,
            }),
          );
          return;
        }

        if (result.action === "skipped") {
          console.info(
            "[worker] conversation_skipped",
            JSON.stringify({
              jobId: job.id,
              sessionId: currentJob.sessionId,
              reason: result.reason,
            }),
          );
          return;
        }

        await job.updateProgress({
          currentRound: turnCount,
          maxRounds: 0,
          lastSpeakerPersonaId: currentJob.requestedSpeakerPersonaId ?? "",
        } satisfies AdvanceConversationJobProgress);

        currentJob = result.nextJob;
      }
    },
    {
      connection: redisConnection,
      prefix: workerConfig.queuePrefix,
      concurrency: workerConfig.concurrency,
      lockDuration: 60_000,
      autorun: false,
    },
  );

  return worker;
};
