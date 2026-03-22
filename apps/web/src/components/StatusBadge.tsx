import type { SessionStatus } from '#/lib/types'

const statusConfig: Record<SessionStatus, { label: string; className: string }> = {
  queued: { label: 'Queued', className: 'status-badge status-badge--queued' },
  active: { label: 'Active', className: 'status-badge status-badge--active' },
  completed: { label: 'Completed', className: 'status-badge status-badge--completed' },
}

interface StatusBadgeProps {
  status: SessionStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span className={config.className} aria-label={`Status: ${config.label}`}>
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: 'currentColor' }}
      />
      {config.label}
    </span>
  )
}
