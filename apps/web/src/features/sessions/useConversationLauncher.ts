import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useCreateSession } from './useCreateSession'
import type { Persona } from '#/lib/types'

export type ConversationLaunchIntent = 'start' | 'continue'

interface ConversationSelection {
  target: Persona
  intent: ConversationLaunchIntent
}

export function useConversationLauncher(myPersona: Persona | null) {
  const [selection, setSelection] = useState<ConversationSelection | null>(null)
  const [isBootstrappingChat, setIsBootstrappingChat] = useState(false)
  const navigate = useNavigate()
  const createSession = useCreateSession()

  function openConversation(
    target: Persona,
    intent: ConversationLaunchIntent = target.relationship?.hasHistory ? 'continue' : 'start',
  ) {
    if (!myPersona) {
      navigate({ to: '/personas/create' })
      return
    }

    setSelection({ target, intent })
  }

  async function confirmConversation() {
    if (!myPersona || !selection || isBootstrappingChat) return

    setIsBootstrappingChat(true)

    try {
      const session = await createSession.mutateAsync({
        initiatorPersonaId: myPersona.id,
        targetPersonaId: selection.target.id,
      })

      setSelection(null)
      await navigate({ to: '/sessions/$id', params: { id: session.id } })
    } catch (error) {
      console.error(
        '[conversation-launcher] create_session_failed',
        JSON.stringify({
          initiatorPersonaId: myPersona.id,
          targetPersonaId: selection.target.id,
          intent: selection.intent,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    } finally {
      setIsBootstrappingChat(false)
    }
  }

  function cancelConversation() {
    if (isBootstrappingChat) {
      return
    }

    setSelection(null)
  }

  return {
    selectedTarget: selection?.target ?? null,
    selectedIntent: selection?.intent ?? null,
    openConversation,
    confirmConversation,
    cancelConversation,
    isLaunchingConversation: createSession.isPending || isBootstrappingChat,
  }
}
