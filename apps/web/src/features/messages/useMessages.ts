import { useQuery } from '@tanstack/react-query'
import { listMessages } from '#/lib/api-client'
import { queryKeys } from '#/lib/query-keys'

export function useMessages(sessionId: string) {
  const query = useQuery({
    queryKey: queryKeys.messages.bySession(sessionId),
    queryFn: () => listMessages(sessionId),
    enabled: !!sessionId,
    refetchInterval: 3_000,
  })

  return {
    messages: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  }
}
