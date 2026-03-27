export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  personas: {
    all: ['personas'] as const,
    list: (input?: {
      excludeUserId?: string
      limit?: number
      cursor?: string
      seed?: string
      viewerPersonaId?: string
      relationshipFilter?: 'all' | 'chatted' | 'new'
    }) =>
      [...queryKeys.personas.all, 'list', input ?? {}] as const,
    mine: () => [...queryKeys.personas.all, 'mine'] as const,
    detail: (id: string) =>
      [...queryKeys.personas.all, 'detail', id] as const,
    presetTraits: ['personas', 'preset-traits'] as const,
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
    history: (input: {
      sessionId: string
      scope: 'session' | 'pair'
      limit: number
    }) =>
      [
        ...queryKeys.messages.bySession(input.sessionId),
        'history',
        { scope: input.scope, limit: input.limit },
      ] as const,
  },
  reports: {
    latest: (personaId: string) =>
      ['reports', 'latest', personaId] as const,
  },
  assessments: {
    all: ['assessments'] as const,
    bootstrap: (personaId: string) =>
      [...queryKeys.assessments.all, 'bootstrap', personaId] as const,
    session: (sessionId: string) =>
      [...queryKeys.assessments.all, 'session', sessionId] as const,
    result: (sessionId: string) =>
      [...queryKeys.assessments.all, 'result', sessionId] as const,
  },
}
