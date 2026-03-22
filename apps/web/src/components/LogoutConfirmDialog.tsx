import { useTranslation } from 'react-i18next'

interface LogoutConfirmDialogProps {
  isOpen: boolean
  isSubmitting: boolean
  displayName: string | null
  onCancel: () => void
  onConfirm: () => Promise<void>
}

export function LogoutConfirmDialog({
  isOpen,
  isSubmitting,
  displayName,
  onCancel,
  onConfirm,
}: LogoutConfirmDialogProps) {
  const { t } = useTranslation()

  if (!isOpen) {
    return null
  }

  const canDismiss = !isSubmitting

  function handleDismiss() {
    if (!canDismiss) {
      return
    }

    onCancel()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      handleDismiss()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm fade-in"
      onClick={handleDismiss}
      onKeyDown={handleKeyDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
        aria-describedby="logout-confirm-description"
        className="relative island-shell w-full max-w-md overflow-hidden rounded-[1.75rem] p-6 sm:p-7 rise-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--lagoon-soft)] to-transparent" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[var(--lagoon-soft)] blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-[var(--hero-b)] blur-3xl" />

        <div className="relative">
          <div className="mb-4 flex items-center gap-3">
            <span className="h-px w-10 bg-gradient-to-r from-[var(--lagoon)] to-transparent opacity-60" />
            <p className="island-kicker mb-0 opacity-80">
              {t('auth.logoutConfirm.kicker')}
            </p>
          </div>
          <h3
            id="logout-confirm-title"
            className="display-title text-[1.55rem] leading-tight text-[var(--sea-ink)] sm:text-[1.75rem]"
          >
            {t('auth.logoutConfirm.title')}
          </h3>
          <p
            id="logout-confirm-description"
            className="mt-3 text-sm leading-6 text-[var(--sea-ink-soft)]"
          >
            {t('auth.logoutConfirm.description', {
              name: displayName ?? t('app.title'),
            })}
          </p>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="btn-ghost min-w-32"
              autoFocus
            >
              {t('auth.logoutConfirm.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void onConfirm()}
              disabled={isSubmitting}
              className="btn-primary min-w-32"
            >
              {isSubmitting
                ? t('auth.logoutConfirm.confirming')
                : t('auth.logoutConfirm.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
