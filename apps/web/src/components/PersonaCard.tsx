import { Clock3, HeartHandshake, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { Persona } from '#/lib/types'

interface PersonaCardProps {
  persona: Persona
  onClick?: () => void
  actions?: React.ReactNode
}

export function PersonaCard({ persona, onClick, actions }: PersonaCardProps) {
  const { t } = useTranslation()
  const relationship = persona.relationship?.hasHistory ? persona.relationship : undefined
  const displayName = persona.displayName || t('persona.untitled')
  const bio = persona.bio?.trim() || t('persona.bioFallback')
  const traits = persona.traits.length > 0 ? persona.traits.slice(0, 4) : [t('persona.traitsFallback')]
  const mutualScore = relationship ? formatMutualScore(relationship.mutualScore) : null
  const lastInteracted = relationship ? formatRelativeTime(relationship.lastInteractedAt, t) : null

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (!onClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <article
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? t('persona.startChatWith', { name: displayName }) : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={[
        'group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border p-5 text-left transition-all duration-300',
        onClick ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lagoon)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)]' : '',
        relationship
          ? 'hover:-translate-y-1.5'
          : 'hover:-translate-y-1',
      ].join(' ')}
      style={{
        borderColor: relationship
          ? 'color-mix(in oklab, var(--lagoon) 40%, var(--card-border))'
          : 'var(--card-border)',
        background: relationship
          ? 'linear-gradient(165deg, var(--card-bg-strong), var(--card-bg))'
          : 'linear-gradient(165deg, var(--card-bg-strong), var(--card-bg))',
        boxShadow: relationship
          ? `0 1px 0 var(--inset-glint) inset, ${`var(--card-shadow-relationship)`}`
          : `0 1px 0 var(--inset-glint) inset, ${`var(--card-shadow)`}`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={[
            'absolute -top-16 h-40 w-40 rounded-full blur-3xl transition-opacity duration-300',
            relationship ? 'right-[-2rem] opacity-70' : 'right-[-3rem] opacity-30 group-hover:opacity-50',
          ].join(' ')}
          style={{ background: 'rgba(242, 204, 143, 0.18)' }}
        />
        <div
          className={[
            'absolute -bottom-16 h-36 w-36 rounded-full blur-3xl transition-opacity duration-300',
            relationship ? 'left-[-1.5rem] opacity-70' : 'left-[-2.5rem] opacity-25 group-hover:opacity-45',
          ].join(' ')}
          style={{ background: 'rgba(224, 122, 95, 0.12)' }}
        />
      </div>

      {relationship ? (
        <div
          className="relative overflow-hidden rounded-2xl border p-4 sm:p-5"
          style={{
            borderColor: 'var(--card-inner-border)',
            background: 'var(--card-inner-bg)',
          }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute -right-6 top-2 h-24 w-24 rounded-full blur-3xl"
              style={{ background: 'rgba(224, 122, 95, 0.12)' }}
            />
            <div
              className="absolute left-3 top-10 h-16 w-16 rounded-full blur-2xl"
              style={{ background: 'rgba(242, 204, 143, 0.12)' }}
            />
          </div>

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-3">
              <span
                className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.18em]"
                style={{
                  borderColor: 'color-mix(in oklab, var(--lagoon) 30%, var(--card-inner-border))',
                  background: 'color-mix(in oklab, var(--lagoon) 12%, var(--card-inner-bg))',
                  color: 'var(--lagoon-deep)',
                }}
              >
                <HeartHandshake size={13} />
                {t('persona.chatted')}
              </span>

              <div className="space-y-2">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--sea-ink-soft)]">
                  {relationship.affinityLabel}
                </p>
                <p className="text-sm leading-relaxed text-[var(--sea-ink)]">
                  {relationship.summaryShort}
                </p>
              </div>
            </div>

            <div className="relative isolate shrink-0 self-start">
              <div
                className="absolute inset-0 rounded-full blur-2xl"
                style={{ background: 'rgba(224, 122, 95, 0.14)' }}
              />
              <div
                className="relative flex h-24 w-24 flex-col items-center justify-center rounded-full border text-center"
                style={{
                  borderColor: 'var(--card-inner-border)',
                  background:
                    'radial-gradient(circle at 35% 30%, var(--card-bg-strong), color-mix(in oklab, var(--card-bg) 82%, var(--palm) 18%))',
                  boxShadow: '0 12px 28px rgba(0, 0, 0, 0.12)',
                }}
              >
                <span className="display-title text-4xl leading-none text-[var(--sea-ink)]">
                  {mutualScore}
                </span>
                <span className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[var(--sea-ink-soft)]">
                  {t('persona.affinity')}
                </span>
              </div>
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2">
            <div
              className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium text-[var(--sea-ink)]"
              style={{
                borderColor: 'var(--card-inner-border)',
                background: 'var(--card-inner-bg)',
              }}
            >
              {t('persona.sessionCount', { count: relationship.sessionCount })}
            </div>
            {lastInteracted ? (
              <div
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-[var(--sea-ink-soft)]"
                style={{
                  borderColor: 'var(--card-inner-border)',
                  background: 'var(--card-inner-bg)',
                }}
              >
                <Clock3 size={13} />
                {lastInteracted}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={`relative flex flex-1 flex-col ${relationship ? 'pt-5' : ''}`}>
        <div className="flex items-start gap-4">
          <div
            className={[
              'relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] text-xl font-bold text-white shadow-lg',
              relationship ? 'rotate-[-4deg]' : '',
            ].join(' ')}
            style={{
              background: relationship
                ? 'linear-gradient(135deg, var(--lagoon), var(--palm) 52%, var(--clay))'
                : 'linear-gradient(135deg, var(--lagoon), var(--lagoon-deep))',
              boxShadow: relationship
                ? '0 14px 32px rgba(188, 94, 65, 0.22)'
                : '0 12px 24px rgba(188, 94, 65, 0.16)',
            }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="display-title truncate text-[1.65rem] leading-tight text-[var(--sea-ink)]">
                  {displayName}
                </h3>
                <p className="mt-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--sea-ink-soft)]">
                  {t('persona.realPerson')}
                </p>
              </div>

              {relationship ? (
                <div
                  className="hidden shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] sm:inline-flex"
                  style={{
                    borderColor: 'var(--card-inner-border)',
                    background: 'color-mix(in oklab, var(--lagoon) 10%, var(--card-inner-bg))',
                    color: 'var(--lagoon-deep)',
                  }}
                >
                  {mutualScore}% {t('persona.affinity')}
                </div>
              ) : (
                <div
                  className="hidden shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] sm:inline-flex"
                  style={{
                    borderColor: 'var(--card-inner-border)',
                    background: 'var(--card-inner-bg)',
                    color: 'var(--sea-ink-soft)',
                  }}
                >
                  <Sparkles size={12} className="mr-1" />
                  {t('persona.startChatWith', { name: displayName })}
                </div>
              )}
            </div>

            <p className="mt-3 text-sm leading-relaxed text-[var(--sea-ink-soft)]">
              {bio}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {traits.map((trait) => (
            <span
              key={trait}
              className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium"
              style={{
                borderColor: relationship
                  ? 'color-mix(in oklab, var(--lagoon) 28%, var(--chip-line))'
                  : 'var(--chip-line)',
                background: relationship
                  ? 'color-mix(in oklab, var(--chip-bg) 80%, var(--palm) 20%)'
                  : 'var(--chip-bg)',
                color: 'var(--sea-ink)',
              }}
            >
              {trait}
            </span>
          ))}
        </div>

        {actions ? (
          <div
            className="mt-5"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </article>
  )
}

function formatMutualScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100)))
}

function formatRelativeTime(dateStr: string, t: TFunction) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return t('time.justNow')
  if (minutes < 60) return t('time.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('time.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  return t('time.daysAgo', { count: days })
}
