import { createServerFn } from '@tanstack/react-start'
import {
  deleteCookie,
  getRequest,
  setCookie,
} from '@tanstack/react-start/server'
import {
  COOKIE_ACCESS_TOKEN_KEY,
  COOKIE_REFRESH_TOKEN_KEY,
  getAccessTokenFromCookie,
  getRefreshTokenFromCookie,
} from './auth-tokens'
import { requestWithRefresh } from './server-request'
import type {
  ApiResponse,
  AuthTokens,
  AuthUser,
  ChatMessage,
  LatestReport,
  ListMessagesInput,
  ListResponse,
  Persona,
  Session,
} from './types'

const API_URL = process.env.API_URL || 'http://localhost:3001'
const AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED'
const COOKIE_OPTIONS = {
  path: '/',
  sameSite: 'lax' as const,
}

interface RequestAuthState {
  accessToken: string | null
  refreshToken: string | null
}

interface FetchPersonasInput {
  cursor?: string
  limit?: number
  excludeUserId?: string
  seed?: string
  viewerPersonaId?: string
  relationshipFilter?: 'all' | 'chatted' | 'new'
}

const requestAuthState = new WeakMap<Request, RequestAuthState>()

function getOrCreateRequestAuthState(): RequestAuthState {
  const request = getRequest()
  const existing = requestAuthState.get(request)
  if (existing) {
    return existing
  }

  const cookie = request.headers.get('cookie') || ''
  const initialState = {
    accessToken: getAccessTokenFromCookie(cookie),
    refreshToken: getRefreshTokenFromCookie(cookie),
  }
  requestAuthState.set(request, initialState)
  return initialState
}

function syncRequestAuthState(tokens: AuthTokens): void {
  requestAuthState.set(getRequest(), {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  })
}

function clearRequestAuthState(): void {
  requestAuthState.set(getRequest(), {
    accessToken: null,
    refreshToken: null,
  })
}

function persistAuthCookies(tokens: AuthTokens): void {
  setCookie(COOKIE_ACCESS_TOKEN_KEY, tokens.accessToken, COOKIE_OPTIONS)
  setCookie(COOKIE_REFRESH_TOKEN_KEY, tokens.refreshToken, COOKIE_OPTIONS)
}

function clearAuthCookies(): void {
  deleteCookie(COOKIE_ACCESS_TOKEN_KEY, COOKIE_OPTIONS)
  deleteCookie(COOKIE_REFRESH_TOKEN_KEY, COOKIE_OPTIONS)
}

async function readApiResponse<T>(res: Response): Promise<ApiResponse<T>> {
  return (await res.json()) as ApiResponse<T>
}

async function refreshServerTokens(): Promise<AuthTokens> {
  const { refreshToken } = getOrCreateRequestAuthState()
  if (!refreshToken) {
    clearRequestAuthState()
    clearAuthCookies()
    throw new Error('No refresh token available.')
  }

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  const json = await readApiResponse<AuthTokens>(res)
  if (!json.success) {
    clearRequestAuthState()
    clearAuthCookies()
    throw new Error(json.error.message)
  }

  syncRequestAuthState(json.data)
  persistAuthCookies(json.data)
  return json.data
}

async function serverRequest<T>(path: string): Promise<T> {
  return requestWithRefresh<T>({
    execute: async (accessToken) => {
      const effectiveToken =
        accessToken ?? getOrCreateRequestAuthState().accessToken
      const headers: Record<string, string> = {}
      if (effectiveToken) {
        headers.Authorization = `Bearer ${effectiveToken}`
      }

      const res = await fetch(`${API_URL}${path}`, { headers })
      const json = await readApiResponse<T>(res)

      if (json.success) {
        return json
      }

      if (json.error.code !== AUTH_TOKEN_EXPIRED) {
        return json
      }

      return json
    },
    refreshTokens: refreshServerTokens,
  })
}

// Personas
export const fetchPersonas = createServerFn({ method: 'GET' })
  .inputValidator((input?: FetchPersonasInput) => ({
    cursor: input?.cursor,
    limit: input?.limit,
    excludeUserId: input?.excludeUserId,
    seed: input?.seed,
    viewerPersonaId: input?.viewerPersonaId,
    relationshipFilter: input?.relationshipFilter,
  }))
  .handler(async ({ data: input }) => {
    const params = new URLSearchParams()

    if (input.cursor) {
      params.set('cursor', input.cursor)
    }
    if (input.limit) {
      params.set('limit', String(input.limit))
    }
    if (input.excludeUserId && !input.viewerPersonaId) {
      params.set('excludeUserId', input.excludeUserId)
    }
    if (input.seed) {
      params.set('seed', input.seed)
    }
    if (input.viewerPersonaId) {
      params.set('viewerPersonaId', input.viewerPersonaId)
    }
    if (input.relationshipFilter) {
      params.set('relationshipFilter', input.relationshipFilter)
    }

    const query = params.toString()
    const path = input.viewerPersonaId
      ? `/discovery/personas?${query}`
      : query
        ? `/personas?${query}`
        : '/personas'
    return serverRequest<ListResponse<Persona>>(path)
  })

export const fetchMyPersonas = createServerFn({ method: 'GET' }).handler(
  async () => {
    return serverRequest<ListResponse<Persona>>('/my/personas')
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
  .inputValidator((input: ListMessagesInput) => ({
    sessionId: input.sessionId,
    cursor: input.cursor,
    limit: input.limit,
    scope: input.scope,
  }))
  .handler(async ({ data: input }) => {
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
    return serverRequest<ListResponse<ChatMessage>>(
      `/sessions/${input.sessionId}/messages${query ? `?${query}` : ''}`,
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
