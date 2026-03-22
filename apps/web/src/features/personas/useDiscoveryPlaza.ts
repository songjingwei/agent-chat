import { useNavigate } from '@tanstack/react-router'
import { usePersonaList } from './usePersonaList'
import { useCreateSession } from '#/features/sessions/useCreateSession'
import { getOrCreateUserId } from '#/lib/userId'
import type { Persona } from '#/lib/types'
import { useState } from 'react'

export function useDiscoveryPlaza() {
  const [selectedTarget, setSelectedTarget] = useState<Persona | null>(null)
  const navigate = useNavigate()

  const userId = typeof window !== 'undefined' ? getOrCreateUserId() : ''
  const { personas: allPersonas, isLoading: allLoading, error: allError } = usePersonaList()
  const { personas: myPersonas, isLoading: myLoading } = usePersonaList(userId)

  const createSession = useCreateSession()

  const myPersona = myPersonas[0] ?? null
  const otherPersonas = allPersonas.filter((p) => p.userId !== userId)

  function handleStartChat(target: Persona) {
    if (!myPersona) {
      navigate({ to: '/personas/create' })
      return
    }
    setSelectedTarget(target)
  }

  function confirmStartChat() {
    if (!myPersona || !selectedTarget) return

    createSession.mutate(
      {
        initiatorPersonaId: myPersona.id,
        targetPersonaId: selectedTarget.id,
      },
      {
        onSuccess: (session) => {
          setSelectedTarget(null)
          navigate({ to: '/sessions/$id', params: { id: session.id } })
        },
      },
    )
  }

  function cancelSelection() {
    setSelectedTarget(null)
  }

  return {
    allPersonas,
    otherPersonas,
    myPersona,
    selectedTarget,
    handleStartChat,
    confirmStartChat,
    cancelSelection,
    isLoading: allLoading || myLoading,
    isCreatingSession: createSession.isPending,
    error: allError,
  }
}
