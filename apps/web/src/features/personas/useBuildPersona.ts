import { useMutation, useQueryClient } from '@tanstack/react-query'
import { buildPersona } from '#/lib/api-client'
import { queryKeys } from '#/lib/query-keys'
import type { BuildPersonaInput } from '#/lib/types'

export function useBuildPersona() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: BuildPersonaInput) => buildPersona(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personas.all })
    },
  })
}
