import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchMessages } from '#/lib/server-fns'
import { queryKeys } from '#/lib/query-keys'
import type { ChatMessage } from '#/lib/types'

interface UseMessagesOptions {
  live?: boolean
  scope?: 'session' | 'pair'
  limit?: number
}

const DEFAULT_LIMIT = 30

export function useMessages(
  sessionId: string,
  { live = true, scope = 'session', limit = DEFAULT_LIMIT }: UseMessagesOptions = {},
) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.messages.history({ sessionId, scope, limit }),
    queryFn: ({ pageParam }) =>
      fetchMessages({
        data: {
          sessionId,
          cursor: pageParam ?? undefined,
          limit,
          scope,
        },
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? null,
    enabled: !!sessionId,
    refetchInterval: live ? 1_000 : false,
  })

  const messages = useMemo(() => {
    const pages = query.data?.pages ?? []
    const timeline = [...pages].reverse().flatMap((page) => page.items as ChatMessage[])
    const unique = new Map<string, ChatMessage>()
    for (const message of timeline) {
      if (!unique.has(message.id)) {
        unique.set(message.id, message)
      }
    }
    return [...unique.values()].sort((a, b) => {
      if (a.createdAt === b.createdAt) {
        return a.id.localeCompare(b.id)
      }
      return a.createdAt.localeCompare(b.createdAt)
    })
  }, [query.data?.pages])

  return {
    messages,
    total: query.data?.pages[0]?.total ?? messages.length,
    hasOlder: Boolean(query.hasNextPage),
    isFetchingOlder: query.isFetchingNextPage,
    fetchOlder: query.fetchNextPage,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  }
}
