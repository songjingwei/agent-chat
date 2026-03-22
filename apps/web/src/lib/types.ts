export interface Persona {
  id: string
  userId: string
  displayName: string
  bio?: string | undefined
  traits: string[]
  createdAt: string
  updatedAt: string
}

export type SessionStatus = 'queued' | 'active' | 'completed'

export interface Session {
  id: string
  initiatorPersonaId: string
  targetPersonaId: string
  status: SessionStatus
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: string
  sessionId: string
  authorPersonaId: string
  role: 'human'
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

export interface CreatePersonaInput {
  userId: string
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

export interface ListResponse<T> {
  items: T[]
  total: number
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
