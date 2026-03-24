import { useTranslation } from 'react-i18next'
import type { Persona } from '#/lib/types'

interface PersonaCardProps {
  persona: Persona
  onClick?: () => void
  actions?: React.ReactNode
}

export function PersonaCard({ persona, onClick, actions }: PersonaCardProps) {
  const isClickable = !!onClick
  const { t } = useTranslation()
  const displayName = persona.displayName.trim() || t('persona.untitled')
  const bio = persona.bio?.trim()
  const hasTraits = persona.traits.length > 0

  return (
    <div
      className={`feature-card border border-[var(--line)] rounded-2xl p-4 rise-in h-full min-h-[176px] flex flex-col ${isClickable ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick()
            }
          : undefined
      }
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? t('persona.startChatWith', { name: displayName }) : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div
          className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-xs"
          style={{
            background: `linear-gradient(135deg, var(--lagoon), var(--palm))`,
          }}
        >
          {displayName.charAt(0).toUpperCase() || '?'}
        </div>
        {actions && <div className="flex gap-1">{actions}</div>}
      </div>

      <h3 className="font-semibold text-[var(--sea-ink)] text-base mb-1">
        {displayName}
      </h3>

      <p
        className={`text-sm text-[var(--sea-ink-soft)] line-clamp-2 h-9 mb-2 ${bio ? '' : 'opacity-60 italic'}`}
      >
        {bio || t('persona.bioFallback')}
      </p>

      <div className="flex flex-wrap content-start gap-1 h-8 overflow-hidden">
        {hasTraits ? (
          <>
            {persona.traits.slice(0, 5).map((trait) => (
              <span key={trait} className="trait-chip">
                {trait}
              </span>
            ))}
            {persona.traits.length > 5 && (
              <span className="trait-chip opacity-60">
                +{persona.traits.length - 5}
              </span>
            )}
          </>
        ) : (
          <span className="trait-chip opacity-60">
            {t('persona.traitsFallback')}
          </span>
        )}
      </div>

      <p className="text-[0.6875rem] text-[var(--sea-ink-soft)] opacity-50 mt-auto pt-1 italic">
        {t('persona.realPerson')}
      </p>
    </div>
  )
}
