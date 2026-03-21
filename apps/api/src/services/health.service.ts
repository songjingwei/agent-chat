export class HealthService {
  private readonly startedAt: number;

  constructor() {
    this.startedAt = Date.now();
  }

  getStatus() {
    return {
      status: "ok" as const,
      service: "agent-api",
      now: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      checks: {
        inMemoryStore: "ok" as const,
      },
    };
  }
}
