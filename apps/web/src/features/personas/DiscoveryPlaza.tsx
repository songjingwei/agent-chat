import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, HeartHandshake, RefreshCw, Wand2 } from 'lucide-react'
import { ConversationLauncherDialog } from '#/components/ConversationLauncherDialog'
import { PersonaCard } from '#/components/PersonaCard'
import { EmptyState } from '#/components/EmptyState'
import { ErrorDisplay } from '#/components/ErrorDisplay'
import { LoadingSkeleton } from '#/components/LoadingSkeleton'
import { useDiscoveryPlaza } from './useDiscoveryPlaza'

export function DiscoveryPlaza() {
  const { t } = useTranslation()
  const {
    discoveryPersonas,
    chattedPersonas,
    chattedPage,
    chattedPageCount,
    hasChatHistory,
    canGoPreviousHistoryPage,
    canGoNextHistoryPage,
    goToPreviousHistoryPage,
    goToNextHistoryPage,
    total,
    shuffleDiscoveryBatch,
    canShuffleDiscovery,
    myPersona,
    selectedTarget,
    selectedIntent,
    handleStartChat,
    confirmStartChat,
    cancelSelection,
    isLoading,
    isCreatingSession,
    error,
  } = useDiscoveryPlaza()
  const primaryActionTo = myPersona ? '/personas' : '/personas/create'
  const primaryActionLabel = myPersona ? t('nav.myAgents') : t('plaza.createYourAgent')
  const historyPagerButtonClass =
    'mt-1 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-strong)] text-[var(--sea-ink-soft)] shadow-sm backdrop-blur-md transition-all hover:-translate-y-px hover:border-[var(--lagoon)] hover:text-[var(--lagoon-deep)] disabled:cursor-not-allowed disabled:opacity-35'

  return (
    <div>
      {/* Hero */}
      <section className="text-center py-12 sm:py-20 rise-in">
        <span className="island-kicker">{t('plaza.welcomeTo')}</span>
        <h1 className="display-title text-3xl sm:text-5xl font-bold text-[var(--sea-ink)] mt-3 mb-4">
          {t('plaza.title')}
        </h1>
        <p className="text-base sm:text-lg text-[var(--sea-ink-soft)] max-w-md mx-auto mb-6">
          {t('plaza.subtitle')}
        </p>

        {/* Soul counter — plaza-wide social proof */}
        {total > 0 && (
          <div className="flex justify-center mb-8">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium tracking-wide"
              style={{
                borderColor: 'color-mix(in oklab, var(--lagoon) 30%, var(--line))',
                background: 'color-mix(in oklab, var(--surface-strong) 85%, var(--lagoon-soft) 15%)',
                color: 'var(--sea-ink)',
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              {t('plaza.agentCount', { count: total })}
            </span>
          </div>
        )}

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
      {hasChatHistory ? (
        <section className="mb-8 rise-in" style={{ animationDelay: '80ms' }}>
          <div className="mb-4">
            {chattedPageCount > 1 ? (
              <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-start gap-3 sm:gap-4">
                <button
                  type="button"
                  aria-label={t('plaza.previousPage')}
                  onClick={goToPreviousHistoryPage}
                  disabled={!canGoPreviousHistoryPage}
                  className={historyPagerButtonClass}
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="min-w-0 text-center">
                  <span className="island-kicker">{t('plaza.chattedAgentsKicker')}</span>
                  <h2 className="mt-2 text-lg font-semibold text-[var(--sea-ink)]">
                    {t('plaza.chattedAgentsTitle')}
                  </h2>
                  <div className="mt-2 inline-flex rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-[12px] font-semibold tracking-[0.08em] text-[var(--sea-ink-soft)]">
                    {t('plaza.page', { current: chattedPage + 1, total: chattedPageCount })}
                  </div>
                </div>

                <button
                  type="button"
                  aria-label={t('plaza.nextPage')}
                  onClick={goToNextHistoryPage}
                  disabled={!canGoNextHistoryPage}
                  className={historyPagerButtonClass}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            ) : (
              <>
                <span className="island-kicker">{t('plaza.chattedAgentsKicker')}</span>
                <h2 className="mt-2 text-lg font-semibold text-[var(--sea-ink)]">
                  {t('plaza.chattedAgentsTitle')}
                </h2>
              </>
            )}
            <p
              className={`mt-2 text-sm text-[var(--sea-ink-soft)] ${
                chattedPageCount > 1 ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'
              }`}
            >
              {t('plaza.chattedAgentsDesc')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {chattedPersonas.map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                onClick={() => handleStartChat(persona)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section
        className="rise-in"
        style={{ animationDelay: hasChatHistory ? '140ms' : '120ms' }}
      >
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[var(--sea-ink)]">
            {hasChatHistory ? t('plaza.newAgentsTitle') : t('plaza.discoverAgents')}
          </h2>
          {hasChatHistory ? (
            <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
              {t('plaza.newAgentsDesc')}
            </p>
          ) : null}
        </div>

        {isLoading ? (
          <div className="space-y-8">
            {myPersona ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <LoadingSkeleton variant="card" count={3} />
              </div>
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <LoadingSkeleton variant="card" count={6} />
            </div>
          </div>
        ) : discoveryPersonas.length === 0 ? (
          hasChatHistory ? (
            <EmptyState
              icon={<HeartHandshake size={40} />}
              title={t('plaza.noFreshAgents')}
              description={t('plaza.noFreshAgentsDesc')}
            />
          ) : (
            <EmptyState
              icon={<HeartHandshake size={40} />}
              title={t('plaza.noAgents')}
              description={t('plaza.noAgentsDesc')}
              action={{ label: t('persona.createAgent'), href: '/personas/create' }}
            />
          )
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {discoveryPersonas.map(
                (persona) => (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    onClick={() => handleStartChat(persona)}
                  />
                ),
              )}
            </div>
            {canShuffleDiscovery && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={shuffleDiscoveryBatch}
                  disabled={isLoading}
                  className="btn-ghost gap-2 px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw size={15} />
                  {t('plaza.shuffleBatch')}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <ConversationLauncherDialog
        initiatorPersona={myPersona}
        targetPersona={selectedTarget}
        intent={selectedIntent}
        isSubmitting={isCreatingSession}
        onCancel={cancelSelection}
        onConfirm={confirmStartChat}
      />
    </div>
  )
}
