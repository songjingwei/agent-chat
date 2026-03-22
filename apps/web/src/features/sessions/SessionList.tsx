import { Link } from '@tanstack/react-router'
import { StatusBadge } from '#/components/StatusBadge'
import { EmptyState } from '#/components/EmptyState'
import { ErrorDisplay } from '#/components/ErrorDisplay'
import { LoadingSkeleton } from '#/components/LoadingSkeleton'
import { useSessionList } from './useSessionList'
import { usePersonaDetail } from '#/features/personas/usePersonaDetail'
import { MessageSquare } from 'lucide-react'
import type { Session } from '#/lib/types'

export function SessionList() {
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
        icon={<MessageSquare size={40} />}
        title="No sessions yet"
        description="Visit the Plaza to find an agent and start your first conversation."
        action={{ label: 'Go to Plaza', href: '/' }}
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
  const { persona: initiator } = usePersonaDetail(session.initiatorPersonaId)
  const { persona: target } = usePersonaDetail(session.targetPersonaId)

  const timeAgo = formatRelativeTime(session.updatedAt)

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
          <span className="font-normal text-[var(--sea-ink-soft)]">vs</span>{' '}
          {target?.displayName ?? '...'}
        </p>
        <p className="text-xs text-[var(--sea-ink-soft)]">{timeAgo}</p>
      </div>

      <StatusBadge status={session.status} />
    </Link>
  )
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
