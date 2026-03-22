import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import ThemeToggle from './ThemeToggle'
import { LanguageSwitcher } from './LanguageSwitcher'
import Logo from './Logo'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const navKeys = [
  { to: '/', key: 'nav.plaza' },
  { to: '/sessions', key: 'nav.sessions' },
  { to: '/personas', key: 'nav.myAgents' },
] as const

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t } = useTranslation()

  return (
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
        <div className="hidden sm:flex items-center gap-x-4 text-sm font-semibold ml-4">
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

        {/* Right side — desktop: all controls; mobile: only hamburger */}
        <div className="ml-auto flex items-center gap-1.5">
          <Link
            to="/personas/create"
            className="btn-primary hidden sm:inline-flex text-sm py-1.5 px-4"
          >
            {t('nav.newAgent')}
          </Link>
          <span className="hidden sm:contents">
            <LanguageSwitcher />
            <ThemeToggle />
          </span>

          {/* Mobile menu button */}
          <button
            className="sm:hidden rounded-xl p-2 text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-[var(--line)] pb-3 px-2 fade-in">
          <div className="flex flex-col gap-1 pt-2">
            {navKeys.map(({ to, key }) => (
              <Link
                key={to}
                to={to}
                className="nav-link py-2 px-3 text-sm font-semibold"
                activeOptions={{ exact: to === '/' }}
                activeProps={{ className: 'nav-link is-active' }}
                onClick={() => setMobileOpen(false)}
              >
                {t(key)}
              </Link>
            ))}
            <Link
              to="/personas/create"
              className="btn-primary text-sm py-2 px-3 mt-1 text-center"
              onClick={() => setMobileOpen(false)}
            >
              {t('nav.newAgent')}
            </Link>
          </div>
          <div className="flex items-center gap-2 pt-3 mt-2 border-t border-[var(--line)] px-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  )
}
