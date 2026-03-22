import { createFileRoute, redirect } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { MyPersonasList } from '#/features/personas/MyPersonasList'

export const Route = createFileRoute('/personas/')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: PersonasPage,
})

function PersonasPage() {
  const { t } = useTranslation()

  return (
    <main className="page-wrap py-8 sm:py-12">
      <div className="mb-6 rise-in">
        <span className="island-kicker">{t('persona.management')}</span>
        <h1 className="display-title text-2xl sm:text-3xl font-bold text-[var(--sea-ink)] mt-2">
          {t('persona.myAgents')}
        </h1>
        <p className="text-sm text-[var(--sea-ink-soft)] mt-2">
          {t('persona.myAgentsDesc')}
        </p>
      </div>
      <div className="rise-in" style={{ animationDelay: '80ms' }}>
        <MyPersonasList />
      </div>
    </main>
  )
}
