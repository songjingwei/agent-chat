import { useQuery } from '@tanstack/react-query'
import { fetchMyPersonas } from '#/lib/server-fns'
import { queryKeys } from '#/lib/query-keys'

export function useMyPersonas() {
  const query = useQuery({
    queryKey: queryKeys.personas.mine(),
    queryFn: () => fetchMyPersonas(),
  })

  return {
    personas: query.data?.items ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
