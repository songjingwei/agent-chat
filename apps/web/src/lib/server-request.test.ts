import { describe, expect, it, vi } from 'vitest'
import { requestWithRefresh, ServerRequestError } from './server-request'
import type { ApiResponse, AuthTokens } from './types'

describe('requestWithRefresh', () => {
  it('refreshes expired access tokens and retries once with the new token', async () => {
    const execute = vi
      .fn<(accessToken: string | null) => Promise<ApiResponse<{ ok: true }>>>()
      .mockResolvedValueOnce({
        success: false,
        error: {
          code: 'AUTH_TOKEN_EXPIRED',
          message: 'Access token has expired.',
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { ok: true },
      })

    const refreshTokens = vi
      .fn<() => Promise<AuthTokens>>()
      .mockResolvedValue({
        accessToken: 'fresh-access-token',
        refreshToken: 'fresh-refresh-token',
        expiresIn: 900,
      })

    await expect(
      requestWithRefresh({
        execute,
        refreshTokens,
      }),
    ).resolves.toEqual({ ok: true })

    expect(execute).toHaveBeenNthCalledWith(1, null)
    expect(execute).toHaveBeenNthCalledWith(2, 'fresh-access-token')
    expect(refreshTokens).toHaveBeenCalledTimes(1)
  })

  it('throws a typed error when the response is not refreshable', async () => {
    const execute = vi
      .fn<(accessToken: string | null) => Promise<ApiResponse<never>>>()
      .mockResolvedValue({
        success: false,
        error: {
          code: 'AUTH_UNAUTHORIZED',
          message: 'Missing or invalid Authorization header.',
        },
      })

    await expect(
      requestWithRefresh({
        execute,
        refreshTokens: vi.fn(),
      }),
    ).rejects.toMatchObject({
      code: 'AUTH_UNAUTHORIZED',
      message: 'Missing or invalid Authorization header.',
    } satisfies Partial<ServerRequestError>)
  })
})
