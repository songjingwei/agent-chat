import { useQuery } from '@tanstack/react-query'
import { listPersonas } from '#/lib/api-client'
import { queryKeys } from '#/lib/query-keys'

export function usePersonaList() {
  const query = useQuery({
    queryKey: queryKeys.personas.list(),
    queryFn: () => listPersonas(),
  })

  return {
    personas: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
  }
}
