import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface DialogProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  titleId?: string
  descriptionId?: string
  dismissible?: boolean
  maxWidthClassName?: string
}

export function Dialog({
  isOpen,
  onClose,
  children,
  titleId,
  descriptionId,
  dismissible = true,
  maxWidthClassName = 'max-w-md',
}: DialogProps) {
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !dismissible || typeof document === 'undefined') {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [dismissible, isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') {
    return null
  }

  function handleDismiss() {
    if (!dismissible) {
      return
    }

    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm fade-in"
      onClick={handleDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={`relative island-shell w-full overflow-hidden rounded-[1.75rem] p-6 sm:p-7 rise-in ${maxWidthClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--lagoon-soft)] to-transparent" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[var(--lagoon-soft)] blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-[var(--hero-b)] blur-3xl" />
        <div className="relative">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
