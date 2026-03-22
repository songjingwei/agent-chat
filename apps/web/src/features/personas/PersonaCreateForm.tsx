import { ErrorDisplay } from '#/components/ErrorDisplay'
import { usePersonaCreateForm } from './usePersonaCreateForm'
import { X, Sparkles, Plus } from 'lucide-react'

export function PersonaCreateForm() {
  const {
    displayName,
    setDisplayName,
    bio,
    setBio,
    traits,
    traitInput,
    setTraitInput,
    addTrait,
    removeTrait,
    handleTraitKeyDown,
    handleSubmit,
    isPending,
    error,
  } = usePersonaCreateForm()

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Display Name */}
      <div>
        <label
          htmlFor="displayName"
          className="block text-sm font-semibold text-[var(--sea-ink)] mb-1.5"
        >
          Agent Name
        </label>
        <input
          id="displayName"
          type="text"
          className="form-field"
          placeholder="Give your agent a unique name"
          maxLength={80}
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <p className="text-xs text-[var(--sea-ink-soft)] mt-1">
          {displayName.length}/80
        </p>
      </div>

      {/* Bio */}
      <div>
        <label
          htmlFor="bio"
          className="block text-sm font-semibold text-[var(--sea-ink)] mb-1.5"
        >
          Bio
          <span className="font-normal text-[var(--sea-ink-soft)]"> (optional)</span>
        </label>
        <textarea
          id="bio"
          className="form-field min-h-[100px] resize-y"
          placeholder="Describe your agent's personality, interests, and conversational style..."
          maxLength={1000}
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <p className="text-xs text-[var(--sea-ink-soft)] mt-1">
          {bio.length}/1000
        </p>
      </div>

      {/* Traits */}
      <div>
        <label
          htmlFor="traitInput"
          className="block text-sm font-semibold text-[var(--sea-ink)] mb-1.5"
        >
          Personality Traits
          <span className="font-normal text-[var(--sea-ink-soft)]">
            {' '}
            ({traits.length}/20)
          </span>
        </label>

        {traits.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {traits.map((trait) => (
              <span key={trait} className="trait-chip">
                {trait}
                <button
                  type="button"
                  onClick={() => removeTrait(trait)}
                  className="ml-0.5 opacity-60 hover:opacity-100"
                  aria-label={`Remove trait: ${trait}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            id="traitInput"
            type="text"
            className="form-field flex-1"
            placeholder="Type a trait and press Enter"
            maxLength={80}
            value={traitInput}
            onChange={(e) => setTraitInput(e.target.value)}
            onKeyDown={handleTraitKeyDown}
            disabled={traits.length >= 20}
          />
          <button
            type="button"
            onClick={addTrait}
            className="btn-ghost shrink-0"
            disabled={!traitInput.trim() || traits.length >= 20}
            aria-label="Add trait"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <ErrorDisplay error={error} />}

      {/* Submit */}
      <button
        type="submit"
        className="btn-primary w-full"
        disabled={isPending || !displayName.trim()}
      >
        {isPending ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Creating...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Create Agent
          </>
        )}
      </button>
    </form>
  )
}
