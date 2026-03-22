import { useTranslation } from 'react-i18next'
import type { SessionStatus } from '#/lib/types'

const statusClassMap: Record<SessionStatus, string> = {
  queued: 'status-badge status-badge--queued',
  active: 'status-badge status-badge--active',
  completed: 'status-badge status-badge--completed',
}

interface StatusBadgeProps {
  status: SessionStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation()
  const label = t(`status.${status}`)

  return (
    <span className={statusClassMap[status]} aria-label={t('status.label', { status: label })}>
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: 'currentColor' }}
      />
      {label}
    </span>
  )
}
