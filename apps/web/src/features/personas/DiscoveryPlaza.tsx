import { useTranslation, Trans } from 'react-i18next'
import { PersonaCard } from '#/components/PersonaCard'
import { EmptyState } from '#/components/EmptyState'
import { ErrorDisplay } from '#/components/ErrorDisplay'
import { LoadingSkeleton } from '#/components/LoadingSkeleton'
import { useDiscoveryPlaza } from './useDiscoveryPlaza'
import { HeartHandshake, Wand2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export function DiscoveryPlaza() {
  const { t } = useTranslation()
  const {
    otherPersonas,
    allPersonas,
    myPersona,
    selectedTarget,
    handleStartChat,
    confirmStartChat,
    cancelSelection,
    isLoading,
    isCreatingSession,
    error,
  } = useDiscoveryPlaza()

  return (
    <div>
      {/* Hero */}
      <section className="text-center py-12 sm:py-20 rise-in">
        <span className="island-kicker">{t('plaza.welcomeTo')}</span>
        <h1 className="display-title text-3xl sm:text-5xl font-bold text-[var(--sea-ink)] mt-3 mb-4">
          {t('plaza.title')}
        </h1>
        <p className="text-base sm:text-lg text-[var(--sea-ink-soft)] max-w-md mx-auto mb-8">
          {t('plaza.subtitle')}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/personas/create" className="btn-primary">
            <Wand2 size={16} />
            {t('plaza.createYourAgent')}
          </Link>
          {myPersona && (
            <Link to="/sessions" className="btn-ghost">
              {t('plaza.mySessions')}
            </Link>
          )}
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="mb-6">
          <ErrorDisplay error={error} />
        </div>
      )}

      {/* Persona grid */}
      <section className="rise-in" style={{ animationDelay: '120ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--sea-ink)]">
            {t('plaza.discoverAgents')}
          </h2>
          <span className="text-sm text-[var(--sea-ink-soft)] inline-flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            {t('plaza.agentCount', { count: allPersonas.length })}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <LoadingSkeleton variant="card" count={6} />
          </div>
        ) : otherPersonas.length === 0 && allPersonas.length === 0 ? (
          <EmptyState
            icon={<HeartHandshake size={40} />}
            title={t('plaza.noAgents')}
            description={t('plaza.noAgentsDesc')}
            action={{ label: t('persona.createAgent'), href: '/personas/create' }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(otherPersonas.length > 0 ? otherPersonas : allPersonas).map(
              (persona) => (
                <PersonaCard
                  key={persona.id}
                  persona={persona}
                  onClick={() => handleStartChat(persona)}
                />
              ),
            )}
          </div>
        )}
      </section>

      {/* Confirmation modal */}
      {selectedTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm fade-in"
          onClick={cancelSelection}
        >
          <div
            className="island-shell rounded-2xl p-6 max-w-sm w-full rise-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--sea-ink)] mb-2">
              {t('plaza.startConversation')}
            </h3>
            <p className="text-sm text-[var(--sea-ink-soft)] mb-1">
              <Trans
                i18nKey="plaza.startConversationDesc"
                values={{
                  initiator: myPersona?.displayName ?? '',
                  target: selectedTarget.displayName,
                }}
                components={{ strong: <strong /> }}
              />
            </p>
            <div className="flex gap-2 mt-6">
              <button onClick={cancelSelection} className="btn-ghost flex-1">
                {t('plaza.cancel')}
              </button>
              <button
                onClick={confirmStartChat}
                disabled={isCreatingSession}
                className="btn-primary flex-1"
              >
                {isCreatingSession ? t('plaza.starting') : t('plaza.startChat')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
