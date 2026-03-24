export interface Persona {
  id: string;
  userId: string;
  displayName: string;
  bio?: string | undefined;
  traits: string[];
  createdAt: string;
  updatedAt: string;
}

export type SessionStatus = "queued" | "active" | "completed";

export interface Session {
  id: string;
  initiatorPersonaId: string;
  targetPersonaId: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  authorPersonaId: string;
  role: "agent" | "human" | "system";
  content: string;
  createdAt: string;
}

export interface LatestReport {
  personaId: string;
  sessionId: string;
  generatedAt: string;
  sessionStatus: SessionStatus;
  totalMessages: number;
  latestMessagePreview: string | null;
  recommendation: string;
  rationale: string;
}

export interface CreatePersonaInput {
  userId: string;
  displayName: string;
  bio?: string | undefined;
  traits: string[];
}

export interface ListPublicPersonasInput {
  cursor?: string | undefined;
  limit: number;
  excludeUserId?: string | undefined;
}

export interface ListPublicPersonasResult {
  items: Persona[];
  total: number;
  nextCursor: string | null;
}

export interface CreateSessionInput {
  initiatorPersonaId: string;
  targetPersonaId: string;
}

export interface ListSessionsInput {
  personaId?: string | undefined;
  userId?: string | undefined;
}

export interface CreateHumanMessageInput {
  sessionId: string;
  authorPersonaId: string;
  content: string;
}

export interface CreateAgentMessageInput {
  sessionId: string;
  authorPersonaId: string;
  content: string;
  metadata?: Record<string, unknown> | undefined;
}
