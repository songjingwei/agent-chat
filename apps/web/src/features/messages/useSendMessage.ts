import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sendHumanMessage } from '#/lib/api-client'
import { queryKeys } from '#/lib/query-keys'
import type { CreateHumanMessageInput } from '#/lib/types'

export function useSendMessage(sessionId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateHumanMessageInput) =>
      sendHumanMessage(sessionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.messages.bySession(sessionId),
      })
    },
  })
}
