import { useQuery } from '@tanstack/react-query'
import { fetchMessages } from '#/lib/server-fns'
import { queryKeys } from '#/lib/query-keys'
import type { ChatMessage } from '#/lib/types'

export function useMessages(sessionId: string) {
  const query = useQuery({
    queryKey: queryKeys.messages.bySession(sessionId),
    queryFn: () => fetchMessages({ data: sessionId }),
    enabled: !!sessionId,
    refetchInterval: 3_000,
  })

  return {
    messages: (query.data?.items ?? []) as ChatMessage[],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  }
}
