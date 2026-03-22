const ACCESS_TOKEN_KEY = 'agent-chat-access-token'
const REFRESH_TOKEN_KEY = 'agent-chat-refresh-token'
const COOKIE_ACCESS_TOKEN_KEY = 'agent_access_token'

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  // Sync to cookie so server functions can read it
  document.cookie = `${COOKIE_ACCESS_TOKEN_KEY}=${encodeURIComponent(accessToken)}; path=/; SameSite=Lax`
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  // Clear cookie
  document.cookie = `${COOKIE_ACCESS_TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

export function getAccessTokenFromCookie(cookieHeader: string): string | null {
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_ACCESS_TOKEN_KEY}=([^;]*)`),
  )
  return match ? decodeURIComponent(match[1]) : null
}
