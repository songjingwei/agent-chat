export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  personas: {
    all: ['personas'] as const,
    list: (input?: { excludeUserId?: string; limit?: number; cursor?: string }) =>
      [...queryKeys.personas.all, 'list', input ?? {}] as const,
    mine: () => [...queryKeys.personas.all, 'mine'] as const,
    detail: (id: string) =>
      [...queryKeys.personas.all, 'detail', id] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    list: (personaId?: string) =>
      [...queryKeys.sessions.all, 'list', { personaId }] as const,
    detail: (id: string) =>
      [...queryKeys.sessions.all, 'detail', id] as const,
  },
  messages: {
    bySession: (sessionId: string) =>
      ['messages', sessionId] as const,
  },
  reports: {
    latest: (personaId: string) =>
      ['reports', 'latest', personaId] as const,
  },
}
