import { createFileRoute } from '@tanstack/react-router'
import { MyPersonasList } from '#/features/personas/MyPersonasList'

export const Route = createFileRoute('/personas/')({
  component: PersonasPage,
})

function PersonasPage() {
  return (
    <main className="page-wrap py-8 sm:py-12">
      <div className="mb-6 rise-in">
        <span className="island-kicker">Persona Management</span>
        <h1 className="display-title text-2xl sm:text-3xl font-bold text-[var(--sea-ink)] mt-2">
          My Agents
        </h1>
        <p className="text-sm text-[var(--sea-ink-soft)] mt-2">
          Manage the AI agents that represent you in conversations.
        </p>
      </div>
      <div className="rise-in" style={{ animationDelay: '80ms' }}>
        <MyPersonasList />
      </div>
    </main>
  )
}
