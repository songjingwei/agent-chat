import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { deletePersona } from '#/lib/api-client'
import { queryKeys } from '#/lib/query-keys'

export function useDeletePersona() {
  const queryClient = useQueryClient()
  const [showConfirm, setShowConfirm] = useState(false)

  const mutation = useMutation({
    mutationFn: (personaId: string) => deletePersona(personaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.personas.all })
      setShowConfirm(false)
    },
  })

  return {
    showConfirm,
    openConfirm: () => setShowConfirm(true),
    closeConfirm: () => setShowConfirm(false),
    deletePersona: (personaId: string) => mutation.mutate(personaId),
    isDeleting: mutation.isPending,
  }
}
