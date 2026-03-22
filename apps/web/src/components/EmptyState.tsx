import { Link } from '@tanstack/react-router'

interface EmptyStateProps {
  title: string
  description: string
  icon?: React.ReactNode
  action?: {
    label: string
    href: string
  }
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center rise-in">
      {icon && (
        <div className="mb-4 text-[var(--sea-ink-soft)] opacity-50">{icon}</div>
      )}
      <h3 className="text-lg font-semibold text-[var(--sea-ink)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--sea-ink-soft)] max-w-sm mb-6">{description}</p>
      {action && (
        <Link to={action.href} className="btn-primary">
          {action.label}
        </Link>
      )}
    </div>
  )
}
