import { useState, useRef, useLayoutEffect } from 'react'
import { useSessionDetail } from './useSessionDetail'
import { useMessages } from '#/features/messages/useMessages'
import { useSendMessage } from '#/features/messages/useSendMessage'
import { usePersonaDetail } from '#/features/personas/usePersonaDetail'
import { useAuth } from '#/lib/auth-context'

export function useChatRoom(sessionId: string) {
  const [messageInput, setMessageInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)

  const { session, isLoading: sessionLoading, error: sessionError } = useSessionDetail(sessionId)
  const { messages, isLoading: messagesLoading, error: messagesError } = useMessages(sessionId)
  const sendMutation = useSendMessage(sessionId)

  const {
    persona: initiatorPersona,
    isLoading: initiatorLoading,
  } = usePersonaDetail(session?.initiatorPersonaId ?? '')

  const {
    persona: targetPersona,
    isLoading: targetLoading,
  } = usePersonaDetail(session?.targetPersonaId ?? '')

  const { user } = useAuth()
  const userId = user?.id ?? ''

  const myPersonaId =
    initiatorPersona?.userId === userId
      ? initiatorPersona.id
      : targetPersona?.userId === userId
        ? targetPersona.id
        : null

  const canSendMessage = session?.status === 'active' && myPersonaId !== null

  // Auto-scroll when new messages arrive
  useLayoutEffect(() => {
    if (messages.length > prevCountRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
    prevCountRef.current = messages.length
  }, [messages.length])

  function handleSend() {
    const content = messageInput.trim()
    if (!content || !myPersonaId) return

    sendMutation.mutate(
      { authorPersonaId: myPersonaId, content },
      { onSuccess: () => setMessageInput('') },
    )
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return {
    session,
    messages,
    initiatorPersona,
    targetPersona,
    myPersonaId,
    canSendMessage,
    messageInput,
    setMessageInput,
    handleSend,
    handleKeyDown,
    scrollRef,
    isSending: sendMutation.isPending,
    isLoading: sessionLoading || messagesLoading || initiatorLoading || targetLoading,
    error: sessionError || messagesError,
  }
}
