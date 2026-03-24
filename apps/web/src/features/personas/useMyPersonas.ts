import { useQuery } from '@tanstack/react-query'
import { fetchMyPersonas } from '#/lib/server-fns'
import { queryKeys } from '#/lib/query-keys'

interface UseMyPersonasOptions {
  enabled?: boolean
}

export function useMyPersonas(options: UseMyPersonasOptions = {}) {
  const query = useQuery({
    queryKey: queryKeys.personas.mine(),
    queryFn: () => fetchMyPersonas(),
    enabled: options.enabled ?? true,
  })

  return {
    personas: query.data?.items ?? [],
    hasPersona: (query.data?.items.length ?? 0) > 0,
    isLoading: query.isLoading,
    error: query.error,
  }
}
