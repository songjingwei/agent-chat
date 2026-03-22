import type { Persona } from '#/lib/types'

interface PersonaCardProps {
  persona: Persona
  onClick?: () => void
  actions?: React.ReactNode
}

export function PersonaCard({ persona, onClick, actions }: PersonaCardProps) {
  const isClickable = !!onClick

  return (
    <div
      className={`feature-card border border-[var(--line)] rounded-2xl p-5 rise-in ${isClickable ? 'cursor-pointer' : ''}`}
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
      aria-label={isClickable ? `Start chat with ${persona.displayName}` : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div
          className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-sm"
          style={{
            background: `linear-gradient(135deg, var(--lagoon), var(--palm))`,
          }}
        >
          {persona.displayName.charAt(0).toUpperCase()}
        </div>
        {actions && <div className="flex gap-1">{actions}</div>}
      </div>

      <h3 className="font-semibold text-[var(--sea-ink)] text-base mb-1">
        {persona.displayName}
      </h3>

      {persona.bio && (
        <p className="text-sm text-[var(--sea-ink-soft)] line-clamp-2 mb-3">
          {persona.bio}
        </p>
      )}

      {persona.traits.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
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
        </div>
      )}
    </div>
  )
}
