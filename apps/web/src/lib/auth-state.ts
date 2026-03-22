import type { AuthUser } from './types'

export type AuthStatus = 'unknown' | 'anonymous' | 'authenticated'

export interface AuthState {
  status: AuthStatus
  user: AuthUser | null
  isAuthenticated: boolean
}

export function createUnknownAuthState(): AuthState {
  return {
    status: 'unknown',
    user: null,
    isAuthenticated: false,
  }
}

export function createAnonymousAuthState(): AuthState {
  return {
    status: 'anonymous',
    user: null,
    isAuthenticated: false,
  }
}

export function createAuthenticatedAuthState(user: AuthUser): AuthState {
  return {
    status: 'authenticated',
    user,
    isAuthenticated: true,
  }
}

export async function resolveRouteAuth(): Promise<AuthState> {
  try {
    const { fetchCurrentUser } = await import('./server-fns')
    const user = await fetchCurrentUser()
    return createAuthenticatedAuthState(user)
  } catch {
    return createAnonymousAuthState()
  }
}
