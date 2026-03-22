// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const {
  mockGetCurrentUser,
  mockGetAccessToken,
  mockGetRefreshToken,
  mockSetTokens,
  mockClearTokens,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockGetAccessToken: vi.fn<() => string | null>(),
  mockGetRefreshToken: vi.fn<() => string | null>(),
  mockSetTokens: vi.fn<(accessToken: string, refreshToken: string) => void>(),
  mockClearTokens: vi.fn<() => void>(),
}))

vi.mock('./api-client', () => ({
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  logoutUser: vi.fn(),
  getCurrentUser: () => mockGetCurrentUser(),
}))

vi.mock('./auth-tokens', () => ({
  getAccessToken: () => mockGetAccessToken(),
  getRefreshToken: () => mockGetRefreshToken(),
  setTokens: (...args: [string, string]) => mockSetTokens(...args),
  clearTokens: () => mockClearTokens(),
}))

import { AuthProvider, useAuth } from './auth-context'
import {
  createAnonymousAuthState,
  createAuthenticatedAuthState,
} from './auth-state'

const testUser = {
  id: 'usr_123',
  email: 'song@example.com',
  displayName: 'Song',
  createdAt: '2026-03-22T10:00:00.000Z',
}

function AuthSnapshot({ children }: { children?: ReactNode }) {
  const auth = useAuth()

  return (
    <>
      <div data-testid="auth-status">{auth.status}</div>
      <div data-testid="auth-user">{auth.user?.displayName ?? 'anonymous'}</div>
      <div data-testid="auth-loading">{String(auth.isLoading)}</div>
      {children}
    </>
  )
}

describe('AuthProvider initialization', () => {
  beforeEach(() => {
    mockGetCurrentUser.mockReset()
    mockGetAccessToken.mockReset()
    mockGetRefreshToken.mockReset()
    mockSetTokens.mockReset()
    mockClearTokens.mockReset()
    mockGetAccessToken.mockReturnValue(null)
    mockGetRefreshToken.mockReturnValue(null)
  })

  afterEach(() => {
    cleanup()
  })

  it('keeps the resolved authenticated state on first render', () => {
    render(
      <AuthProvider initialAuth={createAuthenticatedAuthState(testUser)}>
        <AuthSnapshot />
      </AuthProvider>,
    )

    expect(screen.getByTestId('auth-status').textContent).toBe('authenticated')
    expect(screen.getByTestId('auth-user').textContent).toBe('Song')
    expect(screen.getByTestId('auth-loading').textContent).toBe('false')
    expect(mockGetCurrentUser).not.toHaveBeenCalled()
  })

  it('restores the current user when a client token exists', async () => {
    mockGetAccessToken.mockReturnValue('access-token')
    mockGetCurrentUser.mockResolvedValue(testUser)

    render(
      <AuthProvider initialAuth={createAnonymousAuthState()}>
        <AuthSnapshot />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe(
        'authenticated',
      )
    })

    expect(screen.getByTestId('auth-user').textContent).toBe('Song')
    expect(screen.getByTestId('auth-loading').textContent).toBe('false')
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(1)
  })
})
