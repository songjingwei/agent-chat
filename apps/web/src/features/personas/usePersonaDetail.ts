import { useQuery } from '@tanstack/react-query'
import { fetchPersona } from '#/lib/server-fns'
import { queryKeys } from '#/lib/query-keys'

export function usePersonaDetail(id: string) {
  const query = useQuery({
    queryKey: queryKeys.personas.detail(id),
    queryFn: () => fetchPersona({ data: id }),
    enabled: !!id,
  })

  return {
    persona: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
