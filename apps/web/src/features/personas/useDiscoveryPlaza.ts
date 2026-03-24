import { useNavigate } from '@tanstack/react-router'
import { usePersonaList } from './usePersonaList'
import { useMyPersonas } from './useMyPersonas'
import { useCreateSession } from '#/features/sessions/useCreateSession'
import { useAuth } from '#/lib/auth-context'
import type { Persona } from '#/lib/types'
import { useEffect, useState } from 'react'

const PLAZA_PAGE_SIZE = 12

export function useDiscoveryPlaza() {
  const [selectedTarget, setSelectedTarget] = useState<Persona | null>(null)
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [prevCursors, setPrevCursors] = useState<string[]>([])
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const {
    personas: allPersonas,
    total,
    nextCursor,
    isLoading: allLoading,
    error: allError,
  } = usePersonaList({
    excludeUserId: user?.id,
    limit: PLAZA_PAGE_SIZE,
    cursor,
  })
  const { personas: myPersonas, isLoading: myLoading } = useMyPersonas({
    enabled: isAuthenticated,
  })

  const createSession = useCreateSession()

  const myPersona = myPersonas[0] ?? null
  const otherPersonas = allPersonas
  const hasPrevPage = prevCursors.length > 0
  const hasNextPage = !!nextCursor
  const currentPage = prevCursors.length + 1

  useEffect(() => {
    setCursor(undefined)
    setPrevCursors([])
  }, [user?.id])

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

  function goToNextPage() {
    if (!nextCursor || allLoading) {
      return
    }
    setPrevCursors((prev) => [...prev, cursor ?? ''])
    setCursor(nextCursor)
  }

  function goToPrevPage() {
    if (!hasPrevPage || allLoading) {
      return
    }
    const previousCursor = prevCursors[prevCursors.length - 1]
    setPrevCursors((prev) => prev.slice(0, -1))
    setCursor(previousCursor || undefined)
  }

  return {
    otherPersonas,
    total,
    currentPage,
    pageSize: PLAZA_PAGE_SIZE,
    hasPrevPage,
    hasNextPage,
    goToPrevPage,
    goToNextPage,
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
