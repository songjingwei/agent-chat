import { useQuery } from '@tanstack/react-query'
import { fetchLatestReport } from '#/lib/server-fns'
import { queryKeys } from '#/lib/query-keys'

export function useReport(personaId: string) {
  const query = useQuery({
    queryKey: queryKeys.reports.latest(personaId),
    queryFn: () => fetchLatestReport({ data: personaId }),
    enabled: !!personaId,
  })

  return {
    report: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  }
}
