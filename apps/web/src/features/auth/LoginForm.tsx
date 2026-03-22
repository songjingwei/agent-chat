import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { useLogin } from './useLogin'

type LoginFormProps = ReturnType<typeof useLogin>

export function LoginForm({
  email,
  setEmail,
  password,
  setPassword,
  error,
  isPending,
  handleSubmit,
}: LoginFormProps) {
  const { t } = useTranslation()

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="island-shell w-full max-w-md p-8 rise-in">
        <div className="text-center mb-8">
          <p className="island-kicker mb-2">{t('auth.login.kicker')}</p>
          <h1 className="text-2xl font-bold text-[var(--sea-ink)] mb-2">
            {t('auth.login.title')}
          </h1>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            {t('auth.login.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[var(--sea-ink)]">
              {t('auth.login.emailLabel')}
            </span>
            <input
              type="email"
              className="form-field"
              placeholder={t('auth.login.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[var(--sea-ink)]">
              {t('auth.login.passwordLabel')}
            </span>
            <input
              type="password"
              className="form-field"
              placeholder={t('auth.login.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            className="btn-primary mt-2 py-2.5"
            disabled={isPending}
          >
            {isPending ? t('auth.login.submitting') : t('auth.login.submit')}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--sea-ink-soft)] mt-6">
          {t('auth.login.noAccount')}{' '}
          <Link
            to="/register"
            className="text-[var(--lagoon)] font-medium hover:underline"
          >
            {t('auth.login.registerLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
