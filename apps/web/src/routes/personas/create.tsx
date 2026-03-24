import { createFileRoute, redirect } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PersonaCreateForm } from '#/features/personas/PersonaCreateForm'
import { queryKeys } from '#/lib/query-keys'
import { fetchMyPersonas } from '#/lib/server-fns'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/personas/create')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  loader: async ({ context }) => {
    const myPersonas = await context.queryClient.ensureQueryData({
      queryKey: queryKeys.personas.mine(),
      queryFn: () => fetchMyPersonas(),
    })

    if (myPersonas.items.length > 0) {
      throw redirect({ to: '/personas' })
    }
  },
  component: PersonaCreatePage,
})

function PersonaCreatePage() {
  const { t } = useTranslation()

  return (
    <main className="page-wrap py-8 sm:py-12">
      <div className="max-w-lg mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] mb-6"
        >
          <ArrowLeft size={16} />
          {t('persona.create.backToPlaza')}
        </Link>

        <div className="mb-8 rise-in">
          <span className="island-kicker">{t('persona.create.kicker')}</span>
          <h1 className="display-title text-2xl sm:text-3xl font-bold text-[var(--sea-ink)] mt-2">
            {t('persona.create.title')}
          </h1>
          <p className="text-sm text-[var(--sea-ink-soft)] mt-2">
            {t('persona.create.subtitle')}
          </p>
        </div>

        <div className="island-shell rounded-2xl p-6 sm:p-8 rise-in" style={{ animationDelay: '80ms' }}>
          <PersonaCreateForm />
        </div>
      </div>
    </main>
  )
}
