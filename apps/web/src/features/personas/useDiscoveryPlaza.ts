import { useNavigate } from '@tanstack/react-router'
import { usePersonaList } from './usePersonaList'
import { useMyPersonas } from './useMyPersonas'
import { useCreateSession } from '#/features/sessions/useCreateSession'
import { useAuth } from '#/lib/auth-context'
import { sendHumanMessage } from '#/lib/api-client'
import type { Persona } from '#/lib/types'
import { useEffect, useState } from 'react'
import { buildPlazaSeed } from './plaza-seed'

const PLAZA_PAGE_SIZE = 12

export function useDiscoveryPlaza() {
  const [selectedTarget, setSelectedTarget] = useState<Persona | null>(null)
  const [isBootstrappingChat, setIsBootstrappingChat] = useState(false)
  const [batch, setBatch] = useState(0)
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const seed = buildPlazaSeed(user?.id, batch)

  const {
    personas: allPersonas,
    total,
    isLoading: allLoading,
    error: allError,
  } = usePersonaList({
    excludeUserId: user?.id,
    limit: PLAZA_PAGE_SIZE,
    seed,
  })
  const { personas: myPersonas, isLoading: myLoading } = useMyPersonas({
    enabled: isAuthenticated,
  })

  const createSession = useCreateSession()

  const myPersona = myPersonas[0] ?? null
  const otherPersonas = allPersonas

  useEffect(() => {
    setBatch(0)
  }, [user?.id])

  function handleStartChat(target: Persona) {
    if (!myPersona) {
      navigate({ to: '/personas/create' })
      return
    }
    setSelectedTarget(target)
  }

  async function confirmStartChat() {
    if (!myPersona || !selectedTarget || isBootstrappingChat) return

    setIsBootstrappingChat(true)
    let sessionId: string | null = null

    try {
      const session = await createSession.mutateAsync({
        initiatorPersonaId: myPersona.id,
        targetPersonaId: selectedTarget.id,
      })
      sessionId = session.id

      const openingMessage = `你好，${selectedTarget.displayName}。很高兴认识你，我们先从今天最想分享的一件小事开始吧。`
      await sendHumanMessage(session.id, {
        authorPersonaId: myPersona.id,
        content: openingMessage,
      })
    } catch (error) {
      console.error(
        '[plaza] start_chat_bootstrap_failed',
        JSON.stringify({
          targetPersonaId: selectedTarget.id,
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    } finally {
      setSelectedTarget(null)
      setIsBootstrappingChat(false)
      if (sessionId) {
        navigate({ to: '/sessions/$id', params: { id: sessionId } })
      }
    }
  }

  function cancelSelection() {
    setSelectedTarget(null)
  }

  function shuffleBatch() {
    if (allLoading || total <= 1) {
      return
    }
    setBatch((current) => current + 1)
  }

  return {
    otherPersonas,
    total,
    pageSize: PLAZA_PAGE_SIZE,
    shuffleBatch,
    myPersona,
    selectedTarget,
    handleStartChat,
    confirmStartChat,
    cancelSelection,
    isLoading: allLoading || myLoading,
    isCreatingSession: createSession.isPending || isBootstrappingChat,
    error: allError,
  }
}
