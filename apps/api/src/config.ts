const DEFAULT_PORT = 3001;
const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/agent_chat";
const DEFAULT_REDIS_URL = "redis://localhost:6379";
const DEFAULT_HEALTHCHECK_TIMEOUT_MS = 1000;

const parsePort = (value: string | undefined): number => {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_PORT;
  }

  return parsed;
};

const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

export const apiConfig = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parsePort(process.env.PORT),
  serviceName: "agent-api",
  databaseUrl: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
  redisUrl: process.env.REDIS_URL ?? DEFAULT_REDIS_URL,
  healthcheckTimeoutMs: parsePositiveInt(
    process.env.HEALTHCHECK_TIMEOUT_MS,
    DEFAULT_HEALTHCHECK_TIMEOUT_MS,
  ),
  jwtSecret: process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-production",
  jwtAccessExpiresIn: parsePositiveInt(process.env.JWT_ACCESS_EXPIRES_IN, 900),
  jwtRefreshExpiresIn: parsePositiveInt(
    process.env.JWT_REFRESH_EXPIRES_IN,
    604800,
  ),
} as const;
