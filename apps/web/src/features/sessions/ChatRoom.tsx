import { useTranslation } from 'react-i18next'
import { StatusBadge } from '#/components/StatusBadge'
import { EmptyState } from '#/components/EmptyState'
import { ErrorDisplay } from '#/components/ErrorDisplay'
import { LoadingSkeleton } from '#/components/LoadingSkeleton'
import { useChatRoom } from './useChatRoom'
import { Send, MessageCircle } from 'lucide-react'
import type { ChatMessage, Persona } from '#/lib/types'

interface ChatRoomProps {
  sessionId: string
}

export function ChatRoom({ sessionId }: ChatRoomProps) {
  const { t } = useTranslation()
  const {
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
    isSending,
    isLoading,
    error,
  } = useChatRoom(sessionId)

  if (isLoading && !session) {
    return (
      <div className="flex flex-col h-full p-4 space-y-4">
        <LoadingSkeleton variant="message" count={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorDisplay error={error} />
      </div>
    )
  }

  if (!session) return null

  const personaMap: Record<string, Persona> = {}
  if (initiatorPersona) personaMap[initiatorPersona.id] = initiatorPersona
  if (targetPersona) personaMap[targetPersona.id] = targetPersona

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 64px)' }}>
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex -space-x-2">
            {[initiatorPersona, targetPersona].map(
              (p) =>
                p && (
                  <div
                    key={p.id}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-[var(--header-bg)]"
                    style={{
                      background: p.id === myPersonaId
                        ? 'linear-gradient(135deg, var(--lagoon), var(--lagoon-deep))'
                        : 'linear-gradient(135deg, var(--palm), var(--lagoon-deep))',
                    }}
                    title={p.displayName}
                  >
                    {p.displayName.charAt(0).toUpperCase()}
                  </div>
                ),
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--sea-ink)] truncate">
              {initiatorPersona?.displayName ?? '...'}{' '}
              <span className="text-[var(--sea-ink-soft)] font-normal">{t('session.vs')}</span>{' '}
              {targetPersona?.displayName ?? '...'}
            </p>
          </div>
        </div>
        <StatusBadge status={session.status} />
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {messages.length === 0 ? (
          <EmptyState
            icon={<MessageCircle size={40} />}
            title={t('chat.noMessages')}
            description={t('chat.noMessagesDesc')}
          />
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.authorPersonaId === myPersonaId}
              authorName={personaMap[msg.authorPersonaId]?.displayName ?? 'Unknown'}
            />
          ))
        )}
      </div>

      {/* Input area */}
      {canSendMessage && (
        <div className="shrink-0 border-t border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-sm p-3">
          <div className="flex gap-2 items-end max-w-3xl mx-auto">
            <textarea
              className="form-field flex-1 resize-none"
              rows={1}
              placeholder={t('chat.inputPlaceholder')}
              maxLength={2000}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ maxHeight: '120px' }}
              aria-label={t('chat.inputLabel')}
            />
            <button
              onClick={handleSend}
              disabled={isSending || !messageInput.trim()}
              className="btn-primary shrink-0 p-2.5"
              aria-label={t('chat.sendLabel')}
            >
              {isSending ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>
      )}

      {session.status === 'completed' && (
        <div className="shrink-0 text-center py-3 border-t border-[var(--line)] bg-[var(--surface)]">
          <p className="text-sm text-[var(--sea-ink-soft)]">
            {t('chat.ended')}
          </p>
        </div>
      )}

      {session.status === 'queued' && (
        <div className="shrink-0 text-center py-3 border-t border-[var(--line)] bg-[var(--surface)]">
          <p className="text-sm text-[var(--sea-ink-soft)]">
            {t('chat.waiting')}
          </p>
        </div>
      )}
    </div>
  )
}

interface MessageBubbleProps {
  message: ChatMessage
  isMine: boolean
  authorName: string
}

function MessageBubble({ message, isMine, authorName }: MessageBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
      <p className="text-xs text-[var(--sea-ink-soft)] mb-1 px-1">
        {authorName}
      </p>
      <div
        className={`message-bubble ${isMine ? 'message-bubble--mine' : 'message-bubble--other'}`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
      <time className="text-[0.6875rem] text-[var(--sea-ink-soft)] mt-0.5 px-1 opacity-60">
        {time}
      </time>
    </div>
  )
}
