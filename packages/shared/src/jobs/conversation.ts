export const CONVERSATION_QUEUE_NAME = "conversation-advance" as const;

export type AdvanceTrigger =
  | "session_created"
  | "human_message"
  | "system_resume";

export interface AdvanceConversationJobData {
  sessionId: string;
  trigger: AdvanceTrigger;
  requestedSpeakerPersonaId?: string | undefined;
}

export interface AdvanceConversationJobProgress {
  currentRound: number;
  maxRounds: number;
  lastSpeakerPersonaId: string;
}
