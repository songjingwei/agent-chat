import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useMirrorChat } from './useMirrorChat'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Send, Sparkles } from 'lucide-react'

export function MirrorChat() {
  const { t } = useTranslation()
  const { messages, isTyping, sendMessage } = useMirrorChat()
  const [inputValue, setInputValue] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const handleSend = () => {
    if (!inputValue.trim()) return
    sendMessage(inputValue.trim())
    setInputValue('')
  }

  return (
    <main className="page-wrap py-4 sm:py-8">
      <div className="flex flex-col h-[calc(100vh-10rem)] sm:h-[85vh] max-w-2xl mx-auto border border-[var(--line)] rounded-3xl overflow-hidden bg-[var(--surface)] shadow-xl rise-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--line)] bg-[var(--surface-sun)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link
              to="/personas"
              className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--link-bg-hover)] no-underline"
              aria-label="返回"
            >
              <ArrowLeft size={18} className="text-[var(--sea-ink-soft)]" />
            </Link>
            <div className="flex flex-col">
              <h3 className="text-sm font-bold text-[var(--sea-ink)] leading-tight">
                {t('persona.mirrorChat.title')}
              </h3>
              <p className="text-[10px] text-[var(--sea-ink-soft)] opacity-60">
                {t('persona.mirrorChat.subtitle')}
              </p>
            </div>
          </div>
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[var(--lagoon)] to-[var(--clay)] flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-5 scroll-smooth"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'human' ? 'items-end' : 'items-start'} fade-in`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'human'
                    ? 'message-bubble--mine rounded-tr-sm'
                    : 'message-bubble--other rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-[var(--sea-ink-soft)] opacity-40 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-start gap-2 fade-in">
              <div className="message-bubble--other rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--lagoon)] animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--lagoon)] animate-bounce"
                  style={{ animationDelay: '200ms' }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--lagoon)] animate-bounce"
                  style={{ animationDelay: '400ms' }}
                />
              </div>
              <span className="text-[10px] text-[var(--sea-ink-soft)] opacity-40 mt-3">
                {t('persona.mirrorChat.reflecting')}
              </span>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 sm:p-4 border-t border-[var(--line)] bg-[var(--surface-sun)] backdrop-blur-md">
          <div className="relative flex items-end gap-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={t('persona.mirrorChat.inputPlaceholder')}
              className="form-field flex-1 min-h-[44px] max-h-32 rounded-2xl resize-none"
              rows={1}
              aria-label="消息输入"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="h-11 w-11 rounded-xl bg-gradient-to-br from-[var(--lagoon)] to-[var(--clay)] text-white flex items-center justify-center transition-all active:scale-90 disabled:opacity-40 disabled:scale-100 shadow-md"
              aria-label="发送"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
