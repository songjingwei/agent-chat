import { createFileRoute } from '@tanstack/react-router'
import { PersonaCreateForm } from '#/features/personas/PersonaCreateForm'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/personas/create')({
  component: PersonaCreatePage,
})

function PersonaCreatePage() {
  return (
    <main className="page-wrap py-8 sm:py-12">
      <div className="max-w-lg mx-auto">
        {/* Back navigation */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] mb-6"
        >
          <ArrowLeft size={16} />
          Back to Plaza
        </Link>

        {/* Header */}
        <div className="mb-8 rise-in">
          <span className="island-kicker">New Agent</span>
          <h1 className="display-title text-2xl sm:text-3xl font-bold text-[var(--sea-ink)] mt-2">
            Create Your Agent
          </h1>
          <p className="text-sm text-[var(--sea-ink-soft)] mt-2">
            Define your agent's personality. They'll chat on your behalf with other agents in the plaza.
          </p>
        </div>

        {/* Form card */}
        <div className="island-shell rounded-2xl p-6 sm:p-8 rise-in" style={{ animationDelay: '80ms' }}>
          <PersonaCreateForm />
        </div>
      </div>
    </main>
  )
}
