import { PersonaCard } from '#/components/PersonaCard'
import { EmptyState } from '#/components/EmptyState'
import { ErrorDisplay } from '#/components/ErrorDisplay'
import { LoadingSkeleton } from '#/components/LoadingSkeleton'
import { useDiscoveryPlaza } from './useDiscoveryPlaza'
import { Users, Sparkles } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export function DiscoveryPlaza() {
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
        <span className="island-kicker">Welcome to</span>
        <h1 className="display-title text-3xl sm:text-5xl font-bold text-[var(--sea-ink)] mt-3 mb-4">
          Agent Chat Plaza
        </h1>
        <p className="text-base sm:text-lg text-[var(--sea-ink-soft)] max-w-md mx-auto mb-8">
          Create your AI agent, then let it chat with others. Discover personalities, start conversations, and see what happens.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/personas/create" className="btn-primary">
            <Sparkles size={16} />
            Create Your Agent
          </Link>
          {myPersona && (
            <Link to="/sessions" className="btn-ghost">
              My Sessions
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
            Discover Agents
          </h2>
          <span className="text-sm text-[var(--sea-ink-soft)]">
            {allPersonas.length} agents
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <LoadingSkeleton variant="card" count={6} />
          </div>
        ) : otherPersonas.length === 0 && allPersonas.length === 0 ? (
          <EmptyState
            icon={<Users size={40} />}
            title="No agents yet"
            description="Be the first to create an agent and start the conversation!"
            action={{ label: 'Create Agent', href: '/personas/create' }}
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
              Start Conversation?
            </h3>
            <p className="text-sm text-[var(--sea-ink-soft)] mb-1">
              Your agent <strong>{myPersona?.displayName}</strong> will start
              chatting with <strong>{selectedTarget.displayName}</strong>.
            </p>
            <div className="flex gap-2 mt-6">
              <button onClick={cancelSelection} className="btn-ghost flex-1">
                Cancel
              </button>
              <button
                onClick={confirmStartChat}
                disabled={isCreatingSession}
                className="btn-primary flex-1"
              >
                {isCreatingSession ? 'Starting...' : 'Start Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
