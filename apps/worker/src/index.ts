import "./config.js";

import {
  createServices,
  NoopConversationOrchestratorService,
} from "@agent/api/services";

import { workerConfig } from "./config.js";
import { createConversationWorker } from "./processors/conversation.processor.js";

export { QUEUE_NAMES, type QueueName, redisConnection } from "./queues/index.js";

const main = async () => {
  console.info(
    "[worker] starting",
    JSON.stringify({
      concurrency: workerConfig.concurrency,
      redisUrl: workerConfig.redisUrl.replace(/\/\/.*@/, "//***@"),
      queuePrefix: workerConfig.queuePrefix,
      sessionTimeoutMs: workerConfig.sessionTimeoutMs,
    }),
  );

  const services = createServices({
    conversationOrchestrator: new NoopConversationOrchestratorService(),
  });

  const worker = createConversationWorker({
    sessionService: services.sessionService,
    messageService: services.messageService,
    personaService: services.personaService,
    runtimeService: services.runtimeService,
  });

  worker.on("failed", async (job, error) => {
    console.error(
      "[worker] job_failed",
      JSON.stringify({
        jobId: job?.id,
        sessionId: job?.data.sessionId,
        attemptsMade: job?.attemptsMade,
        error: error.message,
      }),
    );

    if (!job?.data.sessionId) {
      return;
    }

    const maxAttempts =
      typeof job.opts.attempts === "number" && job.opts.attempts > 0
        ? job.opts.attempts
        : 1;
    if (job.attemptsMade < maxAttempts) {
      return;
    }

    try {
      const session = await services.sessionService.getById(job.data.sessionId);
      if (session && session.status !== "completed") {
        await services.sessionService.updateStatus(job.data.sessionId, "paused");
      }
    } catch (statusError) {
      console.error(
        "[worker] session_pause_after_failure_failed",
        JSON.stringify({
          jobId: job.id,
          sessionId: job.data.sessionId,
          error:
            statusError instanceof Error
              ? statusError.message
              : String(statusError),
        }),
      );
    }
  });

  worker.on("error", (error) => {
    console.error(
      "[worker] worker_error",
      JSON.stringify({
        error: error.message,
      }),
    );
  });

  const shutdown = async (signal: string) => {
    console.info(`[worker] received ${signal}, shutting down gracefully...`);
    await worker.close();
    console.info("[worker] shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  await worker.run();
  console.info("[worker] running");
};

void main().catch((error) => {
  console.error("[worker] fatal", error);
  process.exit(1);
});
