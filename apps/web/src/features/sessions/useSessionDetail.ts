import { useQuery } from '@tanstack/react-query'
import { fetchSession } from '#/lib/server-fns'
import { queryKeys } from '#/lib/query-keys'

export function useSessionDetail(id: string) {
  const query = useQuery({
    queryKey: queryKeys.sessions.detail(id),
    queryFn: () => fetchSession({ data: id }),
    enabled: !!id,
    refetchInterval: 5_000,
  })

  return {
    session: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
