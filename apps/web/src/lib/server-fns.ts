import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { getAccessTokenFromCookie } from './auth-tokens'
import type {
  ApiResponse,
  AuthUser,
  ChatMessage,
  LatestReport,
  ListResponse,
  Persona,
  Session,
} from './types'

const API_URL = process.env.API_URL || 'http://localhost:3001'

function getTokenFromRequest(): string | null {
  const request = getRequest()
  const cookie = request.headers.get('cookie') || ''
  return getAccessTokenFromCookie(cookie)
}

async function serverRequest<T>(path: string): Promise<T> {
  const token = getTokenFromRequest()
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, { headers })
  const json = (await res.json()) as ApiResponse<T>

  if (!json.success) {
    throw new Error(json.error.message)
  }
  return json.data
}

// Personas
export const fetchPersonas = createServerFn({ method: 'GET' }).handler(
  async () => {
    return serverRequest<ListResponse<Persona>>('/personas')
  },
)

export const fetchPersona = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    return serverRequest<Persona>(`/personas/${id}`)
  })

// Sessions
export const fetchSessions = createServerFn({ method: 'GET' })
  .inputValidator((personaId?: string) => personaId)
  .handler(async ({ data: personaId }) => {
    const params = personaId
      ? `?personaId=${encodeURIComponent(personaId)}`
      : ''
    return serverRequest<ListResponse<Session>>(`/sessions${params}`)
  })

export const fetchSession = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    return serverRequest<Session>(`/sessions/${id}`)
  })

// Messages
export const fetchMessages = createServerFn({ method: 'GET' })
  .inputValidator((sessionId: string) => sessionId)
  .handler(async ({ data: sessionId }) => {
    return serverRequest<ListResponse<ChatMessage>>(
      `/sessions/${sessionId}/messages`,
    )
  })

// Reports
export const fetchLatestReport = createServerFn({ method: 'GET' })
  .inputValidator((personaId: string) => personaId)
  .handler(async ({ data: personaId }) => {
    return serverRequest<LatestReport>(
      `/reports/latest?personaId=${encodeURIComponent(personaId)}`,
    )
  })

// Auth
export const fetchCurrentUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    return serverRequest<AuthUser>('/auth/me')
  },
)
