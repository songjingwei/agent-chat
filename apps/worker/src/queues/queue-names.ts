/**
 * Queue name constants — shared between worker (consumers) and API (producers / Bull Board).
 */
export const QUEUE_NAMES = {
  AGENT_CHAT: "agent-chat",
  REPORT_GENERATION: "report-generation",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
