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

export type SessionStatus = 'queued' | 'active' | 'completed'

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

export interface CreateSessionInput {
  initiatorPersonaId: string
  targetPersonaId: string
}

export interface CreateHumanMessageInput {
  authorPersonaId: string
  content: string
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
