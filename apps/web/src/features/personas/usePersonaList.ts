import { useQuery } from '@tanstack/react-query'
import { fetchPersonas } from '#/lib/server-fns'
import { queryKeys } from '#/lib/query-keys'

interface UsePersonaListOptions {
  excludeUserId?: string
  limit?: number
  cursor?: string
  seed?: string
  viewerPersonaId?: string
  relationshipFilter?: 'all' | 'chatted' | 'new'
  enabled?: boolean
}

export function usePersonaList(options: UsePersonaListOptions = {}) {
  const queryInput = {
    excludeUserId: options.viewerPersonaId ? undefined : options.excludeUserId,
    limit: options.limit,
    cursor: options.cursor,
    seed: options.seed,
    viewerPersonaId: options.viewerPersonaId,
    relationshipFilter: options.relationshipFilter,
  }

  const query = useQuery({
    queryKey: queryKeys.personas.list(queryInput),
    queryFn: () => fetchPersonas({ data: queryInput }),
    enabled: options.enabled ?? true,
  })

  return {
    personas: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    nextCursor: query.data?.nextCursor ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
