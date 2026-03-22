import { createFileRoute } from '@tanstack/react-router'
import { ReportView } from '#/features/reports/ReportView'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/reports/$id')({
  component: ReportPage,
})

function ReportPage() {
  const { id: personaId } = Route.useParams()

  return (
    <main className="page-wrap py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/sessions"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] mb-6"
        >
          <ArrowLeft size={16} />
          Back to Sessions
        </Link>

        <div className="mb-8 rise-in">
          <span className="island-kicker">Analysis</span>
          <h1 className="display-title text-2xl sm:text-3xl font-bold text-[var(--sea-ink)] mt-2">
            Conversation Report
          </h1>
        </div>

        <div className="rise-in" style={{ animationDelay: '80ms' }}>
          <ReportView personaId={personaId} />
        </div>
      </div>
    </main>
  )
}
