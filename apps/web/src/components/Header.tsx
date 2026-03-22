import { Link } from '@tanstack/react-router'
import ThemeToggle from './ThemeToggle'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { to: '/', label: 'Plaza' },
  { to: '/sessions', label: 'Sessions' },
  { to: '/personas', label: 'My Agents' },
] as const

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex items-center gap-x-3 py-3 sm:py-4">
        {/* Brand */}
        <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
          >
            <span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
            Agent Chat
          </Link>
        </h2>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-x-4 text-sm font-semibold ml-4">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="nav-link"
              activeOptions={{ exact: to === '/' }}
              activeProps={{ className: 'nav-link is-active' }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1.5">
          <Link
            to="/personas/create"
            className="btn-primary text-xs sm:text-sm py-1.5 px-3 sm:px-4"
          >
            + New Agent
          </Link>
          <ThemeToggle />

          {/* Mobile menu button */}
          <button
            className="sm:hidden rounded-xl p-2 text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-[var(--line)] pb-3 px-2 fade-in">
          <div className="flex flex-col gap-1 pt-2">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="nav-link py-2 px-3 text-sm font-semibold"
                activeOptions={{ exact: to === '/' }}
                activeProps={{ className: 'nav-link is-active' }}
                onClick={() => setMobileOpen(false)}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
