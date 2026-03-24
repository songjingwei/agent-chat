import { useTranslation, Trans } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { HeartHandshake, Wand2 } from 'lucide-react'
import { ConfirmDialog } from '#/components/ConfirmDialog'
import { PersonaCard } from '#/components/PersonaCard'
import { EmptyState } from '#/components/EmptyState'
import { ErrorDisplay } from '#/components/ErrorDisplay'
import { LoadingSkeleton } from '#/components/LoadingSkeleton'
import { useDiscoveryPlaza } from './useDiscoveryPlaza'

export function DiscoveryPlaza() {
  const { t } = useTranslation()
  const {
    otherPersonas,
    total,
    currentPage,
    hasPrevPage,
    hasNextPage,
    goToPrevPage,
    goToNextPage,
    myPersona,
    selectedTarget,
    handleStartChat,
    confirmStartChat,
    cancelSelection,
    isLoading,
    isCreatingSession,
    error,
  } = useDiscoveryPlaza()
  const primaryActionTo = myPersona ? '/personas' : '/personas/create'
  const primaryActionLabel = myPersona ? t('nav.myAgents') : t('plaza.createYourAgent')

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
          <Link to={primaryActionTo} className="btn-primary">
            <Wand2 size={16} />
            {primaryActionLabel}
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
            {t('plaza.agentCount', { count: total })}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <LoadingSkeleton variant="card" count={6} />
          </div>
        ) : otherPersonas.length === 0 ? (
          <EmptyState
            icon={<HeartHandshake size={40} />}
            title={t('plaza.noAgents')}
            description={t('plaza.noAgentsDesc')}
            action={{ label: t('persona.createAgent'), href: '/personas/create' }}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherPersonas.map(
                (persona) => (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    onClick={() => handleStartChat(persona)}
                  />
                ),
              )}
            </div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={goToPrevPage}
                disabled={!hasPrevPage || isLoading}
                className="btn-ghost px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('plaza.prevPage')}
              </button>
              <span className="text-sm text-[var(--sea-ink-soft)]">
                {t('plaza.pageLabel', { page: currentPage })}
              </span>
              <button
                type="button"
                onClick={goToNextPage}
                disabled={!hasNextPage || isLoading}
                className="btn-ghost px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('plaza.nextPage')}
              </button>
            </div>
          </>
        )}
      </section>

      <ConfirmDialog
        isOpen={selectedTarget !== null}
        isSubmitting={isCreatingSession}
        title={t('plaza.startConversation')}
        description={
          selectedTarget ? (
            <Trans
              i18nKey="plaza.startConversationDesc"
              values={{
                initiator: myPersona?.displayName ?? '',
                target: selectedTarget.displayName,
              }}
              components={{ strong: <strong /> }}
            />
          ) : null
        }
        cancelLabel={t('plaza.cancel')}
        confirmLabel={t('plaza.startChat')}
        confirmingLabel={t('plaza.starting')}
        onCancel={cancelSelection}
        onConfirm={confirmStartChat}
        maxWidthClassName="max-w-sm"
      />
    </div>
  )
}
