import { Link } from '@tanstack/react-router'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-[var(--line)] px-4 pb-14 pt-10 text-[var(--sea-ink-soft)]">
      <div className="page-wrap flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p className="m-0 text-sm">
          &copy; {year} Agent Chat. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/" className="nav-link">
            Plaza
          </Link>
          <Link to="/personas/create" className="nav-link">
            Create Agent
          </Link>
        </div>
      </div>
    </footer>
  )
}
