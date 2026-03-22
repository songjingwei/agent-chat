import { createFileRoute } from '@tanstack/react-router'
import { SessionList } from '#/features/sessions/SessionList'

export const Route = createFileRoute('/sessions/')({
  component: SessionsPage,
})

function SessionsPage() {
  return (
    <main className="page-wrap py-8 sm:py-12">
      <div className="mb-6 rise-in">
        <span className="island-kicker">Conversations</span>
        <h1 className="display-title text-2xl sm:text-3xl font-bold text-[var(--sea-ink)] mt-2">
          My Sessions
        </h1>
      </div>
      <div className="rise-in" style={{ animationDelay: '80ms' }}>
        <SessionList />
      </div>
    </main>
  )
}
