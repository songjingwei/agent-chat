import { type ReactNode, useId } from 'react'
import { Dialog } from './Dialog'

interface ConfirmDialogProps {
  isOpen: boolean
  isSubmitting?: boolean
  kicker?: ReactNode
  title: ReactNode
  description?: ReactNode
  cancelLabel: ReactNode
  confirmLabel: ReactNode
  confirmingLabel?: ReactNode
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  maxWidthClassName?: string
}

export function ConfirmDialog({
  isOpen,
  isSubmitting = false,
  kicker,
  title,
  description,
  cancelLabel,
  confirmLabel,
  confirmingLabel,
  onCancel,
  onConfirm,
  maxWidthClassName,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onCancel}
      dismissible={!isSubmitting}
      titleId={titleId}
      descriptionId={description ? descriptionId : undefined}
      maxWidthClassName={maxWidthClassName}
    >
      {kicker ? (
        <div className="mb-4 flex items-center gap-3">
          <span className="h-px w-10 bg-gradient-to-r from-[var(--lagoon)] to-transparent opacity-60" />
          <p className="island-kicker mb-0 opacity-80">{kicker}</p>
        </div>
      ) : null}

      <h3
        id={titleId}
        className="display-title text-[1.55rem] leading-tight text-[var(--sea-ink)] sm:text-[1.75rem]"
      >
        {title}
      </h3>

      {description ? (
        <div
          id={descriptionId}
          className="mt-3 text-sm leading-6 text-[var(--sea-ink-soft)]"
        >
          {description}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="btn-ghost min-w-32"
          autoFocus
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => void onConfirm()}
          disabled={isSubmitting}
          className="btn-primary min-w-32"
        >
          {isSubmitting && confirmingLabel ? confirmingLabel : confirmLabel}
        </button>
      </div>
    </Dialog>
  )
}
