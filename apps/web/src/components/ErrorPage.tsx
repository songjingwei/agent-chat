import { Link } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { MoveRight, RefreshCw, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function ErrorPage({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation()
  const isDev = import.meta.env.DEV

  return (
    <main className="page-wrap flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4 py-12 text-center relative overflow-hidden">
      {/* 背景装饰：柔和光晕 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-500/8 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-orange-500/5 blur-[80px] rounded-full pointer-events-none" />

      <div className="relative space-y-8 max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="flex justify-center">
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md shadow-2xl">
            <ShieldAlert className="w-10 h-10 text-red-300/60" />
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl md:text-5xl font-extralight tracking-[0.2em] text-white/90 uppercase">
            {t('error.page.title')}
          </h1>
          <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto" />
          <p className="text-lg text-white/50 font-light leading-relaxed max-w-md mx-auto">
            {t('error.page.description')}
          </p>
        </div>

        {isDev && error instanceof Error && (
          <div className="island-shell rounded-xl p-4 text-left max-w-md mx-auto">
            <p className="text-xs font-mono text-[var(--sea-ink-soft)] break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-4 pt-8">
          <button
            type="button"
            onClick={reset}
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full overflow-hidden transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/20 to-rose-400/20 group-hover:from-orange-400/30 group-hover:to-rose-400/30 transition-all border border-white/10" />
            <RefreshCw className="relative w-4 h-4 text-white/60 group-hover:text-white/80 transition-colors" />
            <span className="relative text-white/80 group-hover:text-white font-light tracking-widest transition-colors">
              {t('error.page.retry')}
            </span>
          </button>

          <Link
            to="/"
            className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full overflow-hidden transition-all"
          >
            <div className="absolute inset-0 bg-white/[0.04] group-hover:bg-white/[0.08] transition-all border border-white/10" />
            <span className="relative text-white/60 group-hover:text-white/80 font-light tracking-widest transition-colors">
              {t('error.page.home')}
            </span>
            <MoveRight className="relative w-4 h-4 text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>
    </main>
  )
}
