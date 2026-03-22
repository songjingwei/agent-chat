import { useTranslation } from 'react-i18next'
import { ApiRequestError } from '#/lib/api-client'

interface ErrorDisplayProps {
  error: Error | null
  onRetry?: () => void
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  const { t } = useTranslation()

  if (!error) return null

  const code = error instanceof ApiRequestError ? error.code : 'UNKNOWN_ERROR'
  const message = error.message || 'Something went wrong'

  return (
    <div
      className="island-shell rounded-xl p-4 border-l-4 fade-in"
      style={{ borderLeftColor: '#e05252' }}
      role="alert"
    >
      <p className="text-sm font-semibold text-[var(--sea-ink)] mb-1">{code}</p>
      <p className="text-sm text-[var(--sea-ink-soft)]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-ghost mt-3 text-xs"
          aria-label={t('common.retryRequest')}
        >
          {t('common.tryAgain')}
        </button>
      )}
    </div>
  )
}
