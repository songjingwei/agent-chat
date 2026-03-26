import { Hono } from "hono";
import { Queue } from "bullmq";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { HonoAdapter } from "@bull-board/hono";

import { apiConfig } from "../config.js";

const QUEUE_NAMES = {
  AGENT_CHAT: "agent-chat",
  REPORT_GENERATION: "report-generation",
} as const;

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

  const queues = Object.values(QUEUE_NAMES).map(
    (name) => new Queue(name, { connection }),
  );

  const serverAdapter = new HonoAdapter("/admin/queues");

  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });

  return serverAdapter.registerPlugin();
};
