import { useQuery } from '@tanstack/react-query'
import { fetchPersonas } from '#/lib/server-fns'
import { queryKeys } from '#/lib/query-keys'

export function usePersonaList() {
  const query = useQuery({
    queryKey: queryKeys.personas.list(),
    queryFn: () => fetchPersonas(),
  })

  return {
    personas: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  }
}
