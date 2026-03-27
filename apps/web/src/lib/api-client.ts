import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './auth-tokens'
import type {
  AssessmentResult,
  AssessmentSession,
  ApiResponse,
  AuthResponse,
  AuthTokens,
  AuthUser,
  BuildPersonaInput,
  BuildPersonaResult,
  ChatMessage,
  CreateAssessmentSessionInput,
  CreateHumanMessageInput,
  CreatePersonaInput,
  CreateSessionInput,
  LatestReport,
  ListMessagesInput,
  ListResponse,
  LoginInput,
  Persona,
  RefreshInput,
  RegisterInput,
  Session,
  SubmitAssessmentAnswerInput,
  UpdatePersonaInput,
} from './types'

const configuredApiOrigin = import.meta.env.VITE_API_ORIGIN?.trim()

const API_BASE =
  configuredApiOrigin && configuredApiOrigin.length > 0
    ? configuredApiOrigin.replace(/\/$/, '')
    : import.meta.env.DEV
      ? 'http://localhost:3001'
      : '/api'

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

let isRefreshing = false
let refreshPromise: Promise<AuthTokens> | null = null

async function doRefresh(): Promise<AuthTokens> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new ApiRequestError('AUTH_UNAUTHORIZED', 'No refresh token available.')
  }

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  const json = (await res.json()) as ApiResponse<AuthTokens>
  if (!json.success) {
    throw new ApiRequestError(json.error.code, json.error.message, json.error.details)
  }

  return json.data
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  skipAuth = false,
): Promise<T> {
  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = {}

  if (!skipAuth) {
    const token = getAccessToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

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
    // Try token refresh on expired access token
    if (json.error.code === 'AUTH_TOKEN_EXPIRED' && !skipAuth) {
      if (!isRefreshing) {
        isRefreshing = true
        refreshPromise = doRefresh()
          .then((tokens) => {
            setTokens(tokens.accessToken, tokens.refreshToken)
            return tokens
          })
          .catch((err) => {
            clearTokens()
            window.location.href = '/login'
            throw err
          })
          .finally(() => {
            isRefreshing = false
            refreshPromise = null
          })
      }

      await refreshPromise
      // Retry original request with new token
      return request<T>(method, path, body, false)
    }

    throw new ApiRequestError(
      json.error.code,
      json.error.message,
      json.error.details,
    )
  }

  return json.data
}

// Auth
export function registerUser(input: RegisterInput) {
  return request<AuthResponse>('POST', '/auth/register', input, true)
}

export function loginUser(input: LoginInput) {
  return request<AuthResponse>('POST', '/auth/login', input, true)
}

export function logoutUser(input: RefreshInput) {
  return request<{ message: string }>('POST', '/auth/logout', input)
}

export function refreshTokens(input: RefreshInput) {
  return request<AuthTokens>('POST', '/auth/refresh', input, true)
}

export function getCurrentUser() {
  return request<AuthUser>('GET', '/auth/me')
}

// Personas
export function createPersona(input: CreatePersonaInput) {
  return request<Persona>('POST', '/personas', input)
}

export function buildPersona(input: BuildPersonaInput) {
  return request<BuildPersonaResult>('POST', '/personas/build', input)
}

export function listPersonas(input?: {
  cursor?: string
  limit?: number
  excludeUserId?: string
  seed?: string
  viewerPersonaId?: string
}) {
  const params = new URLSearchParams()

  if (input?.cursor) {
    params.set('cursor', input.cursor)
  }
  if (input?.limit) {
    params.set('limit', String(input.limit))
  }
  if (input?.excludeUserId && !input?.viewerPersonaId) {
    params.set('excludeUserId', input.excludeUserId)
  }
  if (input?.seed) {
    params.set('seed', input.seed)
  }
  if (input?.viewerPersonaId) {
    params.set('viewerPersonaId', input.viewerPersonaId)
  }

  const query = params.toString()
  const path = input?.viewerPersonaId
    ? `/discovery/personas?${query}`
    : query
      ? `/personas?${query}`
      : '/personas'
  return request<ListResponse<Persona>>('GET', path)
}

export function listAllPersonas() {
  return request<ListResponse<Persona>>('GET', '/personas')
}

export function getPersona(id: string) {
  return request<Persona>('GET', `/personas/${id}`)
}

export function getPresetTraits() {
  return request<{ traits: Array<{ zh: string; en: string }> }>('GET', '/configs/persona-traits', undefined, true)
}

export function updatePersona(id: string, input: UpdatePersonaInput) {
  return request<Persona>('PATCH', `/personas/${id}`, input)
}

export function deletePersona(id: string) {
  return request<{ deleted: boolean }>('DELETE', `/personas/${id}`)
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

export function listMessages(input: ListMessagesInput) {
  const params = new URLSearchParams()
  if (input.cursor) {
    params.set('cursor', input.cursor)
  }
  if (input.limit) {
    params.set('limit', String(input.limit))
  }
  if (input.scope) {
    params.set('scope', input.scope)
  }
  const query = params.toString()
  return request<ListResponse<ChatMessage>>(
    'GET',
    `/sessions/${input.sessionId}/messages${query ? `?${query}` : ''}`,
  )
}

// Reports
export function getLatestReport(personaId: string) {
  return request<LatestReport>(
    'GET',
    `/reports/latest?personaId=${encodeURIComponent(personaId)}`,
  )
}

// Assessments
export function createAssessmentSession(input: CreateAssessmentSessionInput) {
  return request<AssessmentSession>('POST', '/assessment-sessions', input)
}

export function getAssessmentSession(sessionId: string) {
  return request<AssessmentSession>('GET', `/assessment-sessions/${sessionId}`)
}

export function submitAssessmentAnswer(
  sessionId: string,
  input: SubmitAssessmentAnswerInput,
) {
  return request<AssessmentSession>(
    'POST',
    `/assessment-sessions/${sessionId}/answers`,
    input,
  )
}

export function getAssessmentResult(sessionId: string) {
  return request<AssessmentResult>(
    'GET',
    `/assessment-sessions/${sessionId}/result`,
  )
}
