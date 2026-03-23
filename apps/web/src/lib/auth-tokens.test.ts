// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearTokens,
  COOKIE_ACCESS_TOKEN_KEY,
  COOKIE_REFRESH_TOKEN_KEY,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './auth-tokens'

function readCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

describe('auth token storage', () => {
  beforeEach(() => {
    localStorage.clear()
    document.cookie = `${COOKIE_ACCESS_TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
    document.cookie = `${COOKIE_REFRESH_TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  })

  it('persists access and refresh tokens to local storage and cookies', () => {
    setTokens('access-token', 'refresh-token')

    expect(localStorage.getItem('agent-chat-access-token')).toBe('access-token')
    expect(localStorage.getItem('agent-chat-refresh-token')).toBe(
      'refresh-token',
    )
    expect(readCookie(COOKIE_ACCESS_TOKEN_KEY)).toBe('access-token')
    expect(readCookie(COOKIE_REFRESH_TOKEN_KEY)).toBe('refresh-token')
  })

  it('prefers cookie tokens and syncs local storage after an SSR refresh', () => {
    localStorage.setItem('agent-chat-access-token', 'stale-access-token')
    localStorage.setItem('agent-chat-refresh-token', 'stale-refresh-token')
    document.cookie = `${COOKIE_ACCESS_TOKEN_KEY}=fresh-access-token; path=/`
    document.cookie = `${COOKIE_REFRESH_TOKEN_KEY}=fresh-refresh-token; path=/`

    expect(getAccessToken()).toBe('fresh-access-token')
    expect(getRefreshToken()).toBe('fresh-refresh-token')
    expect(localStorage.getItem('agent-chat-access-token')).toBe(
      'fresh-access-token',
    )
    expect(localStorage.getItem('agent-chat-refresh-token')).toBe(
      'fresh-refresh-token',
    )
  })

  it('backfills cookies from local storage for existing sessions', () => {
    localStorage.setItem('agent-chat-access-token', 'legacy-access-token')
    localStorage.setItem('agent-chat-refresh-token', 'legacy-refresh-token')

    expect(getAccessToken()).toBe('legacy-access-token')
    expect(getRefreshToken()).toBe('legacy-refresh-token')
    expect(readCookie(COOKIE_ACCESS_TOKEN_KEY)).toBe('legacy-access-token')
    expect(readCookie(COOKIE_REFRESH_TOKEN_KEY)).toBe('legacy-refresh-token')
  })

  it('clears both local storage and cookies on logout', () => {
    setTokens('access-token', 'refresh-token')

    clearTokens()

    expect(localStorage.getItem('agent-chat-access-token')).toBeNull()
    expect(localStorage.getItem('agent-chat-refresh-token')).toBeNull()
    expect(readCookie(COOKIE_ACCESS_TOKEN_KEY)).toBeNull()
    expect(readCookie(COOKIE_REFRESH_TOKEN_KEY)).toBeNull()
  })
})
