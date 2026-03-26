import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useSessionDetail } from './useSessionDetail'
import { useMessages } from '#/features/messages/useMessages'
import { useSendMessage } from '#/features/messages/useSendMessage'
import { usePersonaDetail } from '#/features/personas/usePersonaDetail'
import { useAuth } from '#/lib/auth-context'

export function useChatRoom(sessionId: string) {
  const [messageInput, setMessageInput] = useState('')
  const [hasUnreadNewMessages, setHasUnreadNewMessages] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevCountRef = useRef(0)
  const initialScrollDoneRef = useRef(false)
  const prependAnchorRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null)
  const isLoadingOlderRef = useRef(false)

  const { session, isLoading: sessionLoading, error: sessionError } = useSessionDetail(sessionId)
  const {
    messages,
    hasOlder,
    isFetchingOlder,
    fetchOlder,
    isLoading: messagesLoading,
    error: messagesError,
  } = useMessages(sessionId, {
    live: session?.status !== 'completed',
    scope: 'pair',
    limit: 30,
  })
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

  const lastMessage = messages[messages.length - 1]
  const expectedSpeakerPersonaId = !lastMessage
    ? session?.initiatorPersonaId
    : lastMessage.authorPersonaId === session?.initiatorPersonaId
      ? session?.targetPersonaId
      : session?.initiatorPersonaId

  const canSendMessage =
    (session?.status === 'active' || session?.status === 'queued') &&
    myPersonaId !== null

  useEffect(() => {
    prevCountRef.current = 0
    initialScrollDoneRef.current = false
    prependAnchorRef.current = null
    isLoadingOlderRef.current = false
    setHasUnreadNewMessages(false)
  }, [sessionId])

  const loadOlderMessages = useCallback(async () => {
    const container = scrollRef.current
    if (
      !container ||
      !hasOlder ||
      isFetchingOlder ||
      isLoadingOlderRef.current
    ) {
      return
    }

    isLoadingOlderRef.current = true
    prependAnchorRef.current = {
      scrollTop: container.scrollTop,
      scrollHeight: container.scrollHeight,
    }

    const result = await fetchOlder()
    if (result.status === 'error') {
      prependAnchorRef.current = null
    }
    isLoadingOlderRef.current = false
  }, [fetchOlder, hasOlder, isFetchingOlder])

  const handleMessagesScroll = useCallback(() => {
    const container = scrollRef.current
    if (!container) return

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight
    if (distanceFromBottom < 120) {
      setHasUnreadNewMessages(false)
    }

    if (
      initialScrollDoneRef.current &&
      container.scrollTop <= 80 &&
      hasOlder &&
      !isFetchingOlder &&
      !isLoadingOlderRef.current
    ) {
      void loadOlderMessages()
    }
  }, [hasOlder, isFetchingOlder, loadOlderMessages])

  useLayoutEffect(() => {
    const container = scrollRef.current
    if (!container) {
      prevCountRef.current = messages.length
      return
    }

    if (prependAnchorRef.current) {
      const { scrollTop, scrollHeight } = prependAnchorRef.current
      const delta = container.scrollHeight - scrollHeight
      container.scrollTop = scrollTop + delta
      prependAnchorRef.current = null
      prevCountRef.current = messages.length
      return
    }

    if (!initialScrollDoneRef.current && messages.length > 0) {
      container.scrollTop = container.scrollHeight
      requestAnimationFrame(() => {
        const current = scrollRef.current
        if (current) {
          current.scrollTop = current.scrollHeight
        }
      })
      initialScrollDoneRef.current = true
      prevCountRef.current = messages.length
      setHasUnreadNewMessages(false)
      return
    }

    const hasNewMessages = messages.length > prevCountRef.current
    if (hasNewMessages) {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight
      const nearBottom = distanceFromBottom < 120
      if (nearBottom) {
        container.scrollTop = container.scrollHeight
        setHasUnreadNewMessages(false)
      } else {
        setHasUnreadNewMessages(true)
      }
    }

    prevCountRef.current = messages.length
  }, [messages.length])

  const scrollToLatest = useCallback(() => {
    const container = scrollRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
    setHasUnreadNewMessages(false)
  }, [])

  function handleSend() {
    const content = messageInput.trim()
    if (!content || !myPersonaId) return

    sendMutation.mutate(
      { authorPersonaId: myPersonaId, content },
      {
        onSuccess: () => {
          setMessageInput('')
          scrollToLatest()
        },
      },
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
    handleMessagesScroll,
    hasOlder,
    isFetchingOlder,
    loadOlderMessages,
    hasUnreadNewMessages,
    scrollToLatest,
    expectedSpeakerPersonaId,
    isSending: sendMutation.isPending,
    isLoading: sessionLoading || messagesLoading || initiatorLoading || targetLoading,
    error: sessionError || messagesError,
  }
}
