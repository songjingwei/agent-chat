import type { ApiResponse, AuthTokens, ErrorEnvelope } from './types'

const AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED'

export class ServerRequestError extends Error {
  readonly code: string
  readonly details?: unknown

  constructor(code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ServerRequestError'
    this.code = code
    this.details = details
  }
}

function toServerRequestError(error: ErrorEnvelope['error']) {
  return new ServerRequestError(error.code, error.message, error.details)
}

export async function requestWithRefresh<T>({
  execute,
  refreshTokens,
}: {
  execute: (accessToken: string | null) => Promise<ApiResponse<T>>
  refreshTokens: () => Promise<AuthTokens>
}): Promise<T> {
  return requestWithRefreshInternal({
    execute,
    refreshTokens,
    accessToken: null,
    allowRefresh: true,
  })
}

async function requestWithRefreshInternal<T>({
  execute,
  refreshTokens,
  accessToken,
  allowRefresh,
}: {
  execute: (accessToken: string | null) => Promise<ApiResponse<T>>
  refreshTokens: () => Promise<AuthTokens>
  accessToken: string | null
  allowRefresh: boolean
}): Promise<T> {
  const response = await execute(accessToken)
  if (response.success) {
    return response.data
  }

  if (response.error.code === AUTH_TOKEN_EXPIRED && allowRefresh) {
    const tokens = await refreshTokens()
    return requestWithRefreshInternal({
      execute,
      refreshTokens,
      accessToken: tokens.accessToken,
      allowRefresh: false,
    })
  }

  throw toServerRequestError(response.error)
}
