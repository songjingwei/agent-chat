import { useTranslation } from 'react-i18next'
import { PersonaCard } from '#/components/PersonaCard'
import { EmptyState } from '#/components/EmptyState'
import { ErrorDisplay } from '#/components/ErrorDisplay'
import { LoadingSkeleton } from '#/components/LoadingSkeleton'
import { useMyPersonas } from './useMyPersonas'
import { Heart } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export function MyPersonasList() {
  const { t } = useTranslation()
  const { personas, isLoading, error } = useMyPersonas()

  if (error) return <ErrorDisplay error={error} />

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <LoadingSkeleton variant="card" count={3} />
      </div>
    )
  }

  if (personas.length === 0) {
    return (
      <EmptyState
        icon={<Heart size={40} />}
        title={t('persona.noAgents')}
        description={t('persona.noAgentsDesc')}
        action={{ label: t('persona.createAgent'), href: '/personas/create' }}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {personas.map((persona) => (
        <PersonaCard key={persona.id} persona={persona} />
      ))}

      <Link
        to="/personas/create"
        className="feature-card border border-dashed border-[var(--line)] rounded-2xl p-5 flex flex-col items-center justify-center gap-2 min-h-[140px] text-center no-underline hover:border-[var(--lagoon)]"
      >
        <div className="h-10 w-10 rounded-full bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center">
          <span className="text-xl text-[var(--lagoon)]">+</span>
        </div>
        <span className="text-sm font-semibold text-[var(--sea-ink)]">
          {t('persona.createNewAgent')}
        </span>
      </Link>
    </div>
  )
}
