export interface Persona {
  id: string;
  userId: string;
  displayName: string;
  bio?: string | undefined;
  traits: string[];
  relationship?: PersonaRelationship | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface PersonaRelationship {
  hasHistory: boolean;
  sessionCount: number;
  messageCount: number;
  mutualScore: number;
  confidence: number;
  affinityLabel: string;
  summaryShort: string;
  lastInteractedAt: string;
  lastSessionId: string | null;
}

export type SessionStatus = "queued" | "active" | "paused" | "completed";

export interface Session {
  id: string;
  initiatorPersonaId: string;
  targetPersonaId: string;
  status: SessionStatus;
  currentRound: number;
  maxRounds: number;
  lastMessageContent?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  authorPersonaId: string;
  role: "agent" | "human" | "system";
  content: string;
  metadata?: Record<string, unknown> | undefined;
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
  excludePersonaIds?: string[] | undefined;
  seed: string;
}

export interface ListPublicPersonasResult<TItem = Persona> {
  items: TItem[];
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

export interface CreateSystemMessageInput {
  sessionId: string;
  authorPersonaId: string;
  content: string;
  metadata?: Record<string, unknown> | undefined;
}

export interface BuildPersonaInput {
  userId: string;
  sourceText: string;
  existingPersonaId?: string | undefined;
}

export interface BuildPersonaResult {
  persona: Persona;
  generatedSystemPrompt: string;
  version: number;
}

export type AssessmentSessionStatus =
  | "pending"
  | "in_progress"
  | "submitted"
  | "interpreting"
  | "completed"
  | "failed";

export interface AssessmentQuestionOption {
  label: string;
  value: string;
  dimension?: string | undefined;
  score?: number | undefined;
}

export interface AssessmentQuestion {
  sessionItemId: string;
  itemId: string;
  questionText: string;
  answerType: "single_choice" | "likert" | "free_text";
  options: AssessmentQuestionOption[];
  answer: {
    selectedOptionValue?: string | undefined;
    freeTextAnswer?: string | null | undefined;
  } | null;
}

export interface AssessmentSessionView {
  id: string;
  personaId: string;
  templateId: string;
  templateSlug: string;
  templateName: string;
  status: AssessmentSessionStatus;
  currentIndex: number;
  totalItems: number;
  answeredCount: number;
  currentItem: AssessmentQuestion | null;
  resultReady: boolean;
  startedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
}

export interface AssessmentDimensionScore {
  dimension: string;
  label: string;
  score: number;
  normalizedScore: number;
  evidenceSessionItemIds: string[];
}

export interface AssessmentResultView {
  sessionId: string;
  status: "pending" | "completed" | "failed" | "applied";
  summary: string | null;
  confidence: number | null;
  dimensionScores: AssessmentDimensionScore[];
  applied: boolean;
  appliedVersion: number | null;
}
