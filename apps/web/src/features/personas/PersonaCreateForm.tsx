import { useTranslation } from 'react-i18next'
import { ErrorDisplay } from '#/components/ErrorDisplay'
import { usePersonaCreateForm } from './usePersonaCreateForm'
import { X, Wand2, Plus } from 'lucide-react'

export function PersonaCreateForm() {
  const { t } = useTranslation()
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
          {t('persona.create.nameLabel')}
        </label>
        <input
          id="displayName"
          type="text"
          className="form-field"
          placeholder={t('persona.create.namePlaceholder')}
          maxLength={80}
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <p className="text-xs text-[var(--sea-ink-soft)] mt-1">
          {t('common.charCount', { current: displayName.length, max: 80 })}
        </p>
      </div>

      {/* Bio */}
      <div>
        <label
          htmlFor="bio"
          className="block text-sm font-semibold text-[var(--sea-ink)] mb-1.5"
        >
          {t('persona.create.bioLabel')}
          <span className="font-normal text-[var(--sea-ink-soft)]"> {t('persona.create.bioOptional')}</span>
        </label>
        <textarea
          id="bio"
          className="form-field min-h-[100px] resize-y"
          placeholder={t('persona.create.bioPlaceholder')}
          maxLength={1000}
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <p className="text-xs text-[var(--sea-ink-soft)] mt-1">
          {t('common.charCount', { current: bio.length, max: 1000 })}
        </p>
      </div>

      {/* Traits */}
      <div>
        <label
          htmlFor="traitInput"
          className="block text-sm font-semibold text-[var(--sea-ink)] mb-1.5"
        >
          {t('persona.create.traitsLabel')}
          <span className="font-normal text-[var(--sea-ink-soft)]">
            {' '}
            {t('persona.create.traitsCount', { count: traits.length })}
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
                  aria-label={t('persona.create.removeTrait', { trait })}
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
            placeholder={t('persona.create.traitPlaceholder')}
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
            aria-label={t('persona.create.addTrait')}
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
            {t('persona.create.creating')}
          </>
        ) : (
          <>
            <Wand2 size={16} />
            {t('persona.create.submit')}
          </>
        )}
      </button>
    </form>
  )
}
