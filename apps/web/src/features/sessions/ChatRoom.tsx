import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { StatusBadge } from '#/components/StatusBadge'
import { EmptyState } from '#/components/EmptyState'
import { ErrorDisplay } from '#/components/ErrorDisplay'
import { LoadingSkeleton } from '#/components/LoadingSkeleton'
import { useChatRoom } from './useChatRoom'
import { ArrowDown, ArrowLeft, MessageCircle, Send } from 'lucide-react'
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
    handleMessagesScroll,
    hasOlder,
    isFetchingOlder,
    loadOlderMessages,
    hasUnreadNewMessages,
    scrollToLatest,
    expectedSpeakerPersonaId,
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
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-sm shrink-0 px-4 py-3">
        <div className="flex items-center justify-between gap-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-2 min-w-0 sm:gap-3">
            <Link
              to="/sessions"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-semibold tracking-[0.08em] text-[var(--sea-ink)] no-underline shadow-[0_10px_26px_rgba(60,42,33,0.08)] transition-all hover:-translate-y-px hover:bg-[var(--link-bg-hover)] lg:hidden"
              aria-label={t('chat.backToSessions')}
              title={t('chat.backToSessions')}
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">{t('chat.backToSessions')}</span>
            </Link>
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
        </div>
      </header>

      {/* Messages */}
      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleMessagesScroll}
          className="h-full min-h-0 overflow-y-auto p-4"
        >
          <div className="max-w-3xl mx-auto space-y-3">
            {hasOlder && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={() => void loadOlderMessages()}
                  disabled={isFetchingOlder}
                  className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  {isFetchingOlder ? t('chat.loadingHistory') : t('chat.loadHistory')}
                </button>
              </div>
            )}

            {messages.length === 0 ? (
              <EmptyState
                icon={<MessageCircle size={40} />}
                title={t('chat.noMessages')}
                description={t('chat.noMessagesDesc')}
              />
            ) : (
              <>
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isMine={msg.authorPersonaId === myPersonaId}
                    authorName={personaMap[msg.authorPersonaId]?.displayName ?? 'Unknown'}
                  />
                ))}

                {/* Typing Indicators */}
                {isSending && (
                  <div className="flex flex-col items-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="text-xs text-[var(--sea-ink-soft)] mb-1 px-1">
                      {personaMap[myPersonaId ?? '']?.displayName ?? '...'}
                    </p>
                    <div className="message-bubble message-bubble--mine px-4 py-3">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce" />
                      </div>
                    </div>
                  </div>
                )}

                {session.status === 'active' && !isSending && (
                  <div
                    className={`flex flex-col ${
                      expectedSpeakerPersonaId === myPersonaId ? 'items-end' : 'items-start'
                    } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  >
                    <p className="text-xs text-[var(--sea-ink-soft)] mb-1 px-1">
                      {personaMap[expectedSpeakerPersonaId ?? '']?.displayName ?? '...'}
                    </p>
                    <div
                      className={`message-bubble ${
                        expectedSpeakerPersonaId === myPersonaId
                          ? 'message-bubble--mine'
                          : 'message-bubble--other'
                      } px-4 py-3`}
                    >
                      <div className="flex gap-1">
                        {expectedSpeakerPersonaId === myPersonaId ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:-0.3s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce [animation-delay:-0.15s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce" />
                          </>
                        ) : (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--sea-ink-soft)]/40 animate-bounce [animation-delay:-0.3s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--sea-ink-soft)]/40 animate-bounce [animation-delay:-0.15s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--sea-ink-soft)]/40 animate-bounce" />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {hasUnreadNewMessages && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <button
              type="button"
              onClick={scrollToLatest}
              className="pointer-events-auto btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <ArrowDown size={14} />
              {t('chat.newMessages')}
            </button>
          </div>
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

      {session.status === 'queued' && !canSendMessage && (
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
