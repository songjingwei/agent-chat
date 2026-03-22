import { createFileRoute, redirect } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { SessionList } from '#/features/sessions/SessionList'
import { queryKeys } from '#/lib/query-keys'
import { fetchSessions } from '#/lib/server-fns'

export const Route = createFileRoute('/sessions/')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: queryKeys.sessions.list(),
      queryFn: () => fetchSessions(),
    })
  },
  component: SessionsPage,
})

function SessionsPage() {
  const { t } = useTranslation()

  return (
    <main className="page-wrap py-8 sm:py-12">
      <div className="mb-6 rise-in">
        <span className="island-kicker">{t('session.kicker')}</span>
        <h1 className="display-title text-2xl sm:text-3xl font-bold text-[var(--sea-ink)] mt-2">
          {t('session.title')}
        </h1>
      </div>
      <div className="rise-in" style={{ animationDelay: '80ms' }}>
        <SessionList />
      </div>
    </main>
  )
}
