import { useQuery } from '@tanstack/react-query'
import { fetchSessions } from '#/lib/server-fns'
import { queryKeys } from '#/lib/query-keys'

export function useSessionList(personaId?: string) {
  const query = useQuery({
    queryKey: queryKeys.sessions.list(personaId),
    queryFn: () => fetchSessions({ data: personaId }),
    refetchInterval: 1_000,
  })

  return {
    sessions: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  }
}
