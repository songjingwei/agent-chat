import type {
  ApiResponse,
  ChatMessage,
  CreateHumanMessageInput,
  CreatePersonaInput,
  CreateSessionInput,
  LatestReport,
  ListResponse,
  Persona,
  Session,
} from './types'

const API_BASE = '/api'

export class ApiRequestError extends Error {
  readonly code: string
  readonly details?: unknown

  constructor(code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiRequestError'
    this.code = code
    this.details = details
  }
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const json = (await res.json()) as ApiResponse<T>

  if (!json.success) {
    throw new ApiRequestError(
      json.error.code,
      json.error.message,
      json.error.details,
    )
  }

  return json.data
}

// Personas
export function createPersona(input: CreatePersonaInput) {
  return request<Persona>('POST', '/personas', input)
}

export function listPersonas(userId?: string) {
  const params = userId ? `?userId=${encodeURIComponent(userId)}` : ''
  return request<ListResponse<Persona>>('GET', `/personas${params}`)
}

export function getPersona(id: string) {
  return request<Persona>('GET', `/personas/${id}`)
}

// Sessions
export function createSession(input: CreateSessionInput) {
  return request<Session>('POST', '/sessions', input)
}

export function listSessions(personaId?: string) {
  const params = personaId
    ? `?personaId=${encodeURIComponent(personaId)}`
    : ''
  return request<ListResponse<Session>>('GET', `/sessions${params}`)
}

export function getSession(id: string) {
  return request<Session>('GET', `/sessions/${id}`)
}

// Messages
export function sendHumanMessage(
  sessionId: string,
  input: CreateHumanMessageInput,
) {
  return request<ChatMessage>(
    'POST',
    `/sessions/${sessionId}/human-message`,
    input,
  )
}

export function listMessages(sessionId: string) {
  return request<ListResponse<ChatMessage>>(
    'GET',
    `/sessions/${sessionId}/messages`,
  )
}

// Reports
export function getLatestReport(personaId: string) {
  return request<LatestReport>(
    'GET',
    `/reports/latest?personaId=${encodeURIComponent(personaId)}`,
  )
}
