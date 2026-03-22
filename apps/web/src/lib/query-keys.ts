export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  personas: {
    all: ['personas'] as const,
    list: () => [...queryKeys.personas.all, 'list'] as const,
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
