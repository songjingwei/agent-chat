import { Queue } from "bullmq";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { CONVERSATION_QUEUE_NAME } from "@agent/shared";

import { apiConfig } from "../../config.js";

const parseRedisConnection = (url: string) => {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    password: parsed.password || undefined,
    username: parsed.username || undefined,
  };
};

export const createBullBoardRoutes = () => {
  const connection = parseRedisConnection(apiConfig.redisUrl);
  const prefix = process.env.QUEUE_PREFIX ?? "agent-chat";

  const queues = [
    new Queue(CONVERSATION_QUEUE_NAME, { connection, prefix }),
  ];

  const serverAdapter = new HonoAdapter(serveStatic);
  serverAdapter.setBasePath("/_queue");

  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });

  return serverAdapter.registerPlugin();
};
