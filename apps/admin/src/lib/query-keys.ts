export const queryKeys = {
  users: {
    all: ["admin", "users"] as const,
    detail: (id: string) => ["admin", "users", id] as const,
  },
  personas: {
    all: ["admin", "personas"] as const,
    detail: (id: string) => ["admin", "personas", id] as const,
  },
  sessions: {
    all: ["admin", "sessions"] as const,
    detail: (id: string) => ["admin", "sessions", id] as const,
  },
  messages: {
    bySession: (id: string) => ["admin", "sessions", id, "messages"] as const,
  },
  reports: {
    all: ["admin", "reports"] as const,
    detail: (id: string) => ["admin", "reports", id] as const,
  },
  memory: {
    all: ["admin", "memory-items"] as const,
  },
  configs: {
    all: ["admin", "configs"] as const,
  },
  stats: {
    overview: ["admin", "stats", "overview"] as const,
  },
};
