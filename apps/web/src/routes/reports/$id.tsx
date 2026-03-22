import { createFileRoute, redirect } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ReportView } from '#/features/reports/ReportView'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/reports/$id')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: ReportPage,
})

function ReportPage() {
  const { id: personaId } = Route.useParams()
  const { t } = useTranslation()

  return (
    <main className="page-wrap py-8 sm:py-12">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/sessions"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] mb-6"
        >
          <ArrowLeft size={16} />
          {t('report.backToSessions')}
        </Link>

        <div className="mb-8 rise-in">
          <span className="island-kicker">{t('report.kicker')}</span>
          <h1 className="display-title text-2xl sm:text-3xl font-bold text-[var(--sea-ink)] mt-2">
            {t('report.title')}
          </h1>
        </div>

        <div className="rise-in" style={{ animationDelay: '80ms' }}>
          <ReportView personaId={personaId} />
        </div>
      </div>
    </main>
  )
}
