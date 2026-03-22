// Auth error codes
export const AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS" as const;
export const AUTH_EMAIL_EXISTS = "AUTH_EMAIL_EXISTS" as const;
export const AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED" as const;
export const AUTH_TOKEN_INVALID = "AUTH_TOKEN_INVALID" as const;
export const AUTH_UNAUTHORIZED = "AUTH_UNAUTHORIZED" as const;

// Auth DTOs
export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}
