import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import type { useRegister } from './useRegister'

type RegisterFormProps = ReturnType<typeof useRegister>

export function RegisterForm({
  displayName,
  setDisplayName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  error,
  isPending,
  handleSubmit,
}: RegisterFormProps) {
  const { t } = useTranslation()

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="island-shell w-full max-w-md p-8 rise-in">
        <div className="text-center mb-8">
          <p className="island-kicker mb-2">{t('auth.register.kicker')}</p>
          <h1 className="text-2xl font-bold text-[var(--sea-ink)] mb-2">
            {t('auth.register.title')}
          </h1>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            {t('auth.register.subtitle')}
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
              {t('auth.register.nameLabel')}
            </span>
            <input
              type="text"
              className="form-field"
              placeholder={t('auth.register.namePlaceholder')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={80}
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[var(--sea-ink)]">
              {t('auth.register.emailLabel')}
            </span>
            <input
              type="email"
              className="form-field"
              placeholder={t('auth.register.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[var(--sea-ink)]">
              {t('auth.register.passwordLabel')}
            </span>
            <input
              type="password"
              className="form-field"
              placeholder={t('auth.register.passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[var(--sea-ink)]">
              {t('auth.register.confirmPasswordLabel')}
            </span>
            <input
              type="password"
              className="form-field"
              placeholder={t('auth.register.confirmPasswordPlaceholder')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          <button
            type="submit"
            className="btn-primary mt-2 py-2.5"
            disabled={isPending}
          >
            {isPending
              ? t('auth.register.submitting')
              : t('auth.register.submit')}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--sea-ink-soft)] mt-6">
          {t('auth.register.hasAccount')}{' '}
          <Link
            to="/login"
            className="text-[var(--lagoon)] font-medium hover:underline"
          >
            {t('auth.register.loginLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
