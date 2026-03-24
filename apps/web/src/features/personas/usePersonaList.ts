import { useQuery } from '@tanstack/react-query'
import { fetchPersonas } from '#/lib/server-fns'
import { queryKeys } from '#/lib/query-keys'

interface UsePersonaListOptions {
  excludeUserId?: string
  limit?: number
  cursor?: string
}

export function usePersonaList(options: UsePersonaListOptions = {}) {
  const query = useQuery({
    queryKey: queryKeys.personas.list(options),
    queryFn: () => fetchPersonas({ data: options }),
  })

  return {
    personas: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    nextCursor: query.data?.nextCursor ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
