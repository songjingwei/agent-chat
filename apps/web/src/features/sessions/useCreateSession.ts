import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSession as apiCreateSession } from '#/lib/api-client'
import { queryKeys } from '#/lib/query-keys'
import type { CreateSessionInput } from '#/lib/types'

export function useCreateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateSessionInput) => apiCreateSession(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all })
    },
  })
}
