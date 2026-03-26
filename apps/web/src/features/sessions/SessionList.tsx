import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { StatusBadge } from '#/components/StatusBadge'
import { EmptyState } from '#/components/EmptyState'
import { ErrorDisplay } from '#/components/ErrorDisplay'
import { LoadingSkeleton } from '#/components/LoadingSkeleton'
import { useSessionList } from './useSessionList'
import { usePersonaDetail } from '#/features/personas/usePersonaDetail'
import { Coffee } from 'lucide-react'
import type { Session } from '#/lib/types'
import type { TFunction } from 'i18next'

export function SessionList() {
  const { t } = useTranslation()
  const { sessions, isLoading, error } = useSessionList()

  if (error) return <ErrorDisplay error={error} />

  if (isLoading) {
    return (
      <div className="space-y-2">
        <LoadingSkeleton variant="list-item" count={5} />
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<Coffee size={40} />}
        title={t('session.noSessions')}
        description={t('session.noSessionsDesc')}
        action={{ label: t('session.goToPlaza'), href: '/' }}
      />
    )
  }

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )

  return (
    <div className="island-shell rounded-2xl overflow-hidden divide-y divide-[var(--line)]">
      {sorted.map((session) => (
        <SessionRow key={session.id} session={session} />
      ))}
    </div>
  )
}

function SessionRow({ session }: { session: Session }) {
  const { t } = useTranslation()
  const { persona: initiator } = usePersonaDetail(session.initiatorPersonaId)
  const { persona: target } = usePersonaDetail(session.targetPersonaId)

  const timeAgo = formatRelativeTime(session.updatedAt, t)

  return (
    <Link
      to="/sessions/$id"
      params={{ id: session.id }}
      className="flex items-center gap-3 p-4 hover:bg-[var(--link-bg-hover)] transition-colors no-underline"
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

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--sea-ink)] truncate">
          {initiator?.displayName ?? '...'}{' '}
          <span className="font-normal text-[var(--sea-ink-soft)]">{t('session.vs')}</span>{' '}
          {target?.displayName ?? '...'}
        </p>
        {session.lastMessageContent ? (
          <p className="text-xs text-[var(--sea-ink-soft)] truncate mt-0.5">
            {session.lastMessageContent}
          </p>
        ) : (
          <p className="text-xs text-[var(--sea-ink-soft)]">{timeAgo}</p>
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
