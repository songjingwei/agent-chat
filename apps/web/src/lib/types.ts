export interface Persona {
  id: string
  userId: string
  displayName: string
  bio?: string | undefined
  traits: string[]
  relationship?: PersonaRelationship | undefined
  createdAt: string
  updatedAt: string
}

export interface PersonaRelationship {
  hasHistory: boolean
  sessionCount: number
  messageCount: number
  mutualScore: number
  confidence: number
  affinityLabel: string
  summaryShort: string
  lastInteractedAt: string
  lastSessionId: string | null
}

export type SessionStatus = 'queued' | 'active' | 'paused' | 'completed'

export interface Session {
  id: string
  initiatorPersonaId: string
  targetPersonaId: string
  status: SessionStatus
  currentRound?: number
  maxRounds?: number
  lastMessageContent?: string | undefined
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  sessionId: string
  authorPersonaId: string
  role: 'agent' | 'human' | 'system'
  content: string
  createdAt: string
}

export interface LatestReport {
  personaId: string
  sessionId: string
  generatedAt: string
  sessionStatus: SessionStatus
  totalMessages: number
  latestMessagePreview: string | null
  recommendation: string
  rationale: string
}

export type AssessmentSessionStatus =
  | 'pending'
  | 'in_progress'
  | 'submitted'
  | 'interpreting'
  | 'completed'
  | 'failed'

export interface AssessmentQuestionOption {
  label: string
  value: string
  dimension?: string | undefined
  score?: number | undefined
}

export interface AssessmentQuestion {
  sessionItemId: string
  itemId: string
  questionText: string
  answerType: 'single_choice' | 'likert' | 'free_text'
  options: AssessmentQuestionOption[]
  answer: {
    selectedOptionValue?: string | undefined
    freeTextAnswer?: string | null | undefined
  } | null
}

export interface AssessmentSession {
  id: string
  personaId: string
  templateId: string
  templateSlug: string
  templateName: string
  status: AssessmentSessionStatus
  currentIndex: number
  totalItems: number
  answeredCount: number
  currentItem: AssessmentQuestion | null
  resultReady: boolean
  startedAt: string | null
  submittedAt: string | null
  completedAt: string | null
}

export interface AssessmentDimensionScore {
  dimension: string
  label: string
  score: number
  normalizedScore: number
  evidenceSessionItemIds: string[]
}

export interface AssessmentResult {
  sessionId: string
  status: 'pending' | 'completed' | 'failed' | 'applied'
  summary: string | null
  confidence: number | null
  dimensionScores: AssessmentDimensionScore[]
  applied: boolean
  appliedVersion: number | null
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  displayName: string
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface AuthResponse {
  user: AuthUser
  tokens: AuthTokens
}

export interface RegisterInput {
  email: string
  password: string
  displayName: string
}

export interface LoginInput {
  identifier: string
  password: string
}

export interface RefreshInput {
  refreshToken: string
}

// API input types
export interface CreatePersonaInput {
  displayName: string
  bio?: string | undefined
  traits: string[]
}

export interface UpdatePersonaInput {
  displayName?: string | undefined
  bio?: string | undefined
  traits?: string[] | undefined
  systemPrompt?: string | undefined
}

export interface BuildPersonaInput {
  sourceText: string
  existingPersonaId?: string | undefined
}

export interface BuildPersonaResult {
  persona: Persona
  generatedSystemPrompt: string
  version: number
}

export interface CreateSessionInput {
  initiatorPersonaId: string
  targetPersonaId: string
}

export interface CreateHumanMessageInput {
  authorPersonaId: string
  content: string
}

export interface CreateAssessmentSessionInput {
  personaId: string
  templateSlug?: string | undefined
}

export interface SubmitAssessmentAnswerInput {
  sessionItemId: string
  selectedOptionValue?: string | undefined
  freeTextAnswer?: string | null | undefined
}

export interface ListMessagesInput {
  sessionId: string
  cursor?: string
  limit?: number
  scope?: 'session' | 'pair'
}

export interface ListResponse<T> {
  items: T[]
  total: number
  nextCursor?: string | null
}

export interface SuccessEnvelope<T> {
  success: true
  data: T
}

export interface ErrorEnvelope {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResponse<T> = SuccessEnvelope<T> | ErrorEnvelope
