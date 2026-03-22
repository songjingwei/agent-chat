export const queryKeys = {
  personas: {
    all: ['personas'] as const,
    list: (userId?: string) =>
      [...queryKeys.personas.all, 'list', { userId }] as const,
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
