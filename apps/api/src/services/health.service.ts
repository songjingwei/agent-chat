import net from "node:net";

import { apiConfig } from "../config";

type CheckStatus = "ok" | "error";

type DependencyCheck = {
  status: CheckStatus;
  target: string;
  latencyMs: number;
  error?: string;
};

type HealthProbe = () => Promise<DependencyCheck>;

type HealthServiceOptions = {
  postgresProbe?: HealthProbe;
  redisProbe?: HealthProbe;
};

const createTcpProbe = (
  name: string,
  connectionString: string,
  defaultPort: number,
): HealthProbe => {
  return async () => {
    let url: URL;

    try {
      url = new URL(connectionString);
    } catch (error) {
      return {
        status: "error",
        target: connectionString,
        latencyMs: 0,
        error: error instanceof Error ? error.message : `Invalid ${name} URL.`,
      };
    }

    const host = url.hostname || "localhost";
    const port = Number.parseInt(url.port || `${defaultPort}`, 10);
    const target = `${host}:${port}`;
    const startedAt = Date.now();

    return new Promise<DependencyCheck>((resolve) => {
      let settled = false;
      const socket = net.createConnection({ host, port });

      const finalize = (result: Omit<DependencyCheck, "latencyMs" | "target">) => {
        if (settled) {
          return;
        }

        settled = true;
        socket.removeAllListeners();
        socket.destroy();

        resolve({
          ...result,
          target,
          latencyMs: Date.now() - startedAt,
        });
      };

      socket.setTimeout(apiConfig.healthcheckTimeoutMs, () => {
        finalize({
          status: "error",
          error: `timeout after ${apiConfig.healthcheckTimeoutMs}ms`,
        });
      });

      socket.once("connect", () => {
        finalize({ status: "ok" });
      });

      socket.once("error", (error) => {
        finalize({
          status: "error",
          error: error.message,
        });
      });
    });
  };
};

export class HealthService {
  private readonly startedAt: number;
  private readonly postgresProbe: HealthProbe;
  private readonly redisProbe: HealthProbe;

  constructor(options: HealthServiceOptions = {}) {
    this.startedAt = Date.now();
    this.postgresProbe =
      options.postgresProbe ??
      createTcpProbe("postgres", apiConfig.databaseUrl, 5432);
    this.redisProbe =
      options.redisProbe ??
      createTcpProbe("redis", apiConfig.redisUrl, 6379);
  }

  async getStatus() {
    const [postgres, redis] = await Promise.all([
      this.postgresProbe(),
      this.redisProbe(),
    ]);
    const dependencyChecks = [postgres, redis];

    return {
      status: dependencyChecks.every((check) => check.status === "ok")
        ? ("ok" as const)
        : ("degraded" as const),
      service: apiConfig.serviceName,
      now: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      checks: {
        inMemoryStore: {
          status: "ok" as const,
        },
        postgres,
        redis,
      },
    };
  }
}
