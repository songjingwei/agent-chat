import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPersona } from '#/lib/api-client'
import { queryKeys } from '#/lib/query-keys'
import type { CreatePersonaInput } from '#/lib/types'

export function useCreatePersona() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreatePersonaInput) => createPersona(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personas.all })
    },
  })
}
