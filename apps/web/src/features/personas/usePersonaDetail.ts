import { useQuery } from '@tanstack/react-query'
import { getPersona } from '#/lib/api-client'
import { queryKeys } from '#/lib/query-keys'

export function usePersonaDetail(id: string) {
  const query = useQuery({
    queryKey: queryKeys.personas.detail(id),
    queryFn: () => getPersona(id),
    enabled: !!id,
  })

  return {
    persona: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
