import { useQuery } from '@tanstack/react-query'
import { getLatestReport } from '#/lib/api-client'
import { queryKeys } from '#/lib/query-keys'

export function useReport(personaId: string) {
  const query = useQuery({
    queryKey: queryKeys.reports.latest(personaId),
    queryFn: () => getLatestReport(personaId),
    enabled: !!personaId,
  })

  return {
    report: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
