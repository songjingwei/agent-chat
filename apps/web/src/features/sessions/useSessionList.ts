import { useQuery } from '@tanstack/react-query'
import { listSessions } from '#/lib/api-client'
import { queryKeys } from '#/lib/query-keys'

export function useSessionList(personaId?: string) {
  const query = useQuery({
    queryKey: queryKeys.sessions.list(personaId),
    queryFn: () => listSessions(personaId),
  })

  return {
    sessions: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  }
}
