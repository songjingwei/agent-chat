import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { LogOut, Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '#/lib/auth-context'
import { useMyPersonas } from '#/features/personas/useMyPersonas'
import { ConfirmDialog } from './ConfirmDialog'
import { LanguageSwitcher } from './LanguageSwitcher'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'

const navKeys = [
  { to: '/', key: 'nav.plaza' },
  { to: '/sessions', key: 'nav.sessions' },
  { to: '/personas', key: 'nav.myAgents' },
] as const

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { t } = useTranslation()
  const { user, isAuthenticated, logout } = useAuth()
  const { hasPersona, isLoading: isCheckingPersona } = useMyPersonas({
    enabled: isAuthenticated,
  })
  const shouldPreferMyAgents = hasPersona || isCheckingPersona
  const quickActionTo = shouldPreferMyAgents ? '/personas' : '/personas/create'
  const quickActionLabel = shouldPreferMyAgents ? t('nav.myAgents') : t('nav.newAgent')

  function handleLogoutRequest() {
    setMobileOpen(false)
    setIsLogoutConfirmOpen(true)
  }

  function handleLogoutCancel() {
    if (isLoggingOut) {
      return
    }

    setIsLogoutConfirmOpen(false)
  }

  async function handleLogoutConfirm() {
    setIsLoggingOut(true)

    try {
      await logout()
      setIsLogoutConfirmOpen(false)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
        <nav className="page-wrap flex items-center gap-x-3 py-3 sm:py-4">
          {/* Brand */}
          <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
            >
              <Logo size={22} />
              {t('app.title')}
            </Link>
          </h2>

          {/* Desktop nav */}
          <div className="ml-4 hidden items-center gap-x-4 text-sm font-semibold sm:flex">
            {navKeys.map(({ to, key }) => (
              <Link
                key={to}
                to={to}
                className="nav-link"
                activeOptions={{ exact: to === '/' }}
                activeProps={{ className: 'nav-link is-active' }}
              >
                {t(key)}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-1.5">
            {isAuthenticated ? (
              <>
                <Link
                  to={quickActionTo}
                  className="btn-primary hidden px-4 py-1.5 text-sm sm:inline-flex"
                >
                  {quickActionLabel}
                </Link>
                <span className="hidden items-center gap-2 px-2 text-sm text-[var(--sea-ink-soft)] sm:inline-flex">
                  {user?.displayName}
                </span>
                <button
                  type="button"
                  onClick={handleLogoutRequest}
                  className="hidden items-center gap-1 rounded-xl px-2.5 py-1.5 text-sm text-[var(--sea-ink-soft)] transition-colors hover:bg-[var(--link-bg-hover)] sm:inline-flex"
                  aria-label={t('auth.user.logout')}
                  aria-haspopup="dialog"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="btn-primary hidden px-4 py-1.5 text-sm sm:inline-flex"
              >
                {t('auth.login.submit')}
              </Link>
            )}
            <span className="hidden sm:contents">
              <LanguageSwitcher />
              <ThemeToggle />
            </span>

            {/* Mobile menu button */}
            <button
              type="button"
              className="rounded-xl p-2 text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] sm:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <div className="fade-in border-t border-[var(--line)] px-2 pb-3 sm:hidden">
            <div className="flex flex-col gap-1 pt-2">
              {navKeys.map(({ to, key }) => (
                <Link
                  key={to}
                  to={to}
                  className="nav-link px-3 py-2 text-sm font-semibold"
                  activeOptions={{ exact: to === '/' }}
                  activeProps={{ className: 'nav-link is-active' }}
                  onClick={() => setMobileOpen(false)}
                >
                  {t(key)}
                </Link>
              ))}
              {isAuthenticated ? (
                <>
                  <Link
                    to={quickActionTo}
                    className="btn-primary mt-1 px-3 py-2 text-center text-sm"
                    onClick={() => setMobileOpen(false)}
                  >
                    {quickActionLabel}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogoutRequest}
                    className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]"
                    aria-haspopup="dialog"
                  >
                    <LogOut size={16} />
                    {t('auth.user.logout')}
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="btn-primary mt-1 px-3 py-2 text-center text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  {t('auth.login.submit')}
                </Link>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 border-t border-[var(--line)] px-1 pt-3">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        )}
      </header>

      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        isSubmitting={isLoggingOut}
        kicker={t('auth.logoutConfirm.kicker')}
        title={t('auth.logoutConfirm.title')}
        description={t('auth.logoutConfirm.description', {
          name: user?.displayName ?? t('app.title'),
        })}
        cancelLabel={t('auth.logoutConfirm.cancel')}
        confirmLabel={t('auth.logoutConfirm.confirm')}
        confirmingLabel={t('auth.logoutConfirm.confirming')}
        onCancel={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
    </>
  )
}
