const ACCESS_TOKEN_KEY = 'agent-chat-access-token'
const REFRESH_TOKEN_KEY = 'agent-chat-refresh-token'
export const COOKIE_ACCESS_TOKEN_KEY = 'agent_access_token'
export const COOKIE_REFRESH_TOKEN_KEY = 'agent_refresh_token'
const COOKIE_BASE_ATTRIBUTES = 'path=/; SameSite=Lax'
const COOKIE_EXPIRED_ATTRIBUTES =
  `${COOKIE_BASE_ATTRIBUTES}; expires=Thu, 01 Jan 1970 00:00:00 GMT`

function getTokenFromCookie(cookieHeader: string, cookieKey: string): string | null {
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${cookieKey}=([^;]*)`),
  )
  return match ? decodeURIComponent(match[1]) : null
}

function setBrowserCookie(name: string, value: string): void {
  document.cookie =
    `${name}=${encodeURIComponent(value)}; ${COOKIE_BASE_ATTRIBUTES}`
}

function clearBrowserCookie(name: string): void {
  document.cookie = `${name}=; ${COOKIE_EXPIRED_ATTRIBUTES}`
}

function getClientToken(
  storageKey: string,
  cookieKey: string,
): string | null {
  if (typeof window === 'undefined') return null

  const cookieValue = getTokenFromCookie(document.cookie, cookieKey)
  if (cookieValue) {
    if (localStorage.getItem(storageKey) !== cookieValue) {
      localStorage.setItem(storageKey, cookieValue)
    }
    return cookieValue
  }

  const storageValue = localStorage.getItem(storageKey)
  if (storageValue) {
    // Backfill cookies so SSR/serverFns can refresh tokens for existing sessions.
    setBrowserCookie(cookieKey, storageValue)
  }
  return storageValue
}

export function getAccessToken(): string | null {
  return getClientToken(ACCESS_TOKEN_KEY, COOKIE_ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
  return getClientToken(REFRESH_TOKEN_KEY, COOKIE_REFRESH_TOKEN_KEY)
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  setBrowserCookie(COOKIE_ACCESS_TOKEN_KEY, accessToken)
  setBrowserCookie(COOKIE_REFRESH_TOKEN_KEY, refreshToken)
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  clearBrowserCookie(COOKIE_ACCESS_TOKEN_KEY)
  clearBrowserCookie(COOKIE_REFRESH_TOKEN_KEY)
}

export function getAccessTokenFromCookie(cookieHeader: string): string | null {
  return getTokenFromCookie(cookieHeader, COOKIE_ACCESS_TOKEN_KEY)
}

export function getRefreshTokenFromCookie(cookieHeader: string): string | null {
  return getTokenFromCookie(cookieHeader, COOKIE_REFRESH_TOKEN_KEY)
}
