import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LoadingSkeleton } from '#/components/LoadingSkeleton'
import { ErrorDisplay } from '#/components/ErrorDisplay'
import { StatusBadge } from '#/components/StatusBadge'
import { usePersonaDetail } from '#/features/personas/usePersonaDetail'
import { useSessionList } from './useSessionList'
import { ArrowLeft } from 'lucide-react'
import type { Session } from '#/lib/types'
import type { TFunction } from 'i18next'

interface ChatSessionSidebarProps {
  activeSessionId: string
}

export function ChatSessionSidebar({ activeSessionId }: ChatSessionSidebarProps) {
  const { t } = useTranslation()
  const { sessions, isLoading, error } = useSessionList()

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )

  return (
    <aside className="island-shell hidden h-full w-[320px] shrink-0 overflow-hidden lg:flex lg:flex-col">
      <header className="border-b border-[var(--line)] px-4 py-3">
        <Link
          to="/sessions"
          className="mb-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 text-xs font-semibold tracking-[0.08em] text-[var(--sea-ink)] no-underline shadow-[0_10px_26px_rgba(60,42,33,0.08)] transition-all hover:-translate-y-px hover:bg-[var(--link-bg-hover)]"
          aria-label={t('chat.backToSessions')}
          title={t('chat.backToSessions')}
        >
          <ArrowLeft size={16} />
          <span>{t('chat.backToSessions')}</span>
        </Link>
        <p className="island-kicker">{t('session.kicker')}</p>
        <h2 className="mt-1 text-sm font-semibold text-[var(--sea-ink)]">
          {t('chat.sessionSwitchTitle')}
        </h2>
        <p className="mt-1 text-xs text-[var(--sea-ink-soft)]">
          {t('chat.sessionSwitchHint')}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-2">
        {error && (
          <div className="p-2">
            <ErrorDisplay error={error} />
          </div>
        )}

        {!error && isLoading && (
          <div className="space-y-2 p-2">
            <LoadingSkeleton variant="list-item" count={6} />
          </div>
        )}

        {!error && !isLoading && sorted.length === 0 && (
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-4 text-sm text-[var(--sea-ink-soft)]">
            {t('session.noSessions')}
          </div>
        )}

        {!error && !isLoading && sorted.length > 0 && (
          <div className="space-y-1">
            {sorted.map((session) => (
              <SessionSidebarItem
                key={session.id}
                session={session}
                activeSessionId={activeSessionId}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

function SessionSidebarItem({
  session,
  activeSessionId,
}: {
  session: Session
  activeSessionId: string
}) {
  const { t } = useTranslation()
  const { persona: initiator } = usePersonaDetail(session.initiatorPersonaId)
  const { persona: target } = usePersonaDetail(session.targetPersonaId)
  const timeAgo = formatRelativeTime(session.updatedAt, t)
  const isActive = session.id === activeSessionId

  return (
    <Link
      to="/sessions/$id"
      params={{ id: session.id }}
      className={`flex items-center gap-3 rounded-xl border p-3 no-underline transition-colors ${
        isActive
          ? 'border-[var(--lagoon)] bg-[var(--link-bg-hover)]'
          : 'border-transparent hover:border-[var(--line)] hover:bg-[var(--link-bg-hover)]'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className="flex -space-x-2 shrink-0">
        {[initiator, target].map(
          (p, i) => (
            <div
              key={p?.id ?? i}
              className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-[var(--surface-strong)]"
              style={{
                background: i === 0
                  ? 'linear-gradient(135deg, var(--lagoon), var(--lagoon-deep))'
                  : 'linear-gradient(135deg, var(--palm), var(--lagoon-deep))',
              }}
            >
              {p?.displayName?.charAt(0).toUpperCase() ?? '?'}
            </div>
          ),
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--sea-ink)]">
          {initiator?.displayName ?? '...'}{' '}
          <span className="font-normal text-[var(--sea-ink-soft)]">{t('session.vs')}</span>{' '}
          {target?.displayName ?? '...'}
        </p>
        {session.lastMessageContent ? (
          <p className="truncate text-xs text-[var(--sea-ink-soft)] mt-0.5">
            {session.lastMessageContent}
          </p>
        ) : (
          <p className="truncate text-xs text-[var(--sea-ink-soft)]">{timeAgo}</p>
        )}
      </div>

      <StatusBadge status={session.status} />
    </Link>
  )
}

function formatRelativeTime(dateStr: string, t: TFunction): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return t('time.justNow')
  if (minutes < 60) return t('time.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('time.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  return t('time.daysAgo', { count: days })
}
