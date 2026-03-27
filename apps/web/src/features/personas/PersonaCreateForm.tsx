import { useTranslation } from 'react-i18next'
import { ErrorDisplay } from '#/components/ErrorDisplay'
import { usePersonaCreateForm } from './usePersonaCreateForm'
import { X, Wand2, Plus, User, FileText, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

export function PersonaCreateForm() {
  const { t } = useTranslation()
  const {
    displayName,
    bio,
    setBio,
    traits,
    traitInput,
    setTraitInput,
    presetTraits,
    addTrait,
    togglePresetTrait,
    removeTrait,
    handleTraitKeyDown,
    handleSubmit,
    isPending,
    error,
    // AI build
    sourceText,
    setSourceText,
    showSource,
    setShowSource,
    handleBuild,
    isBuilding,
    buildError,
  } = usePersonaCreateForm()

  return (
    <div className="space-y-8">
      {/* AI Build Section */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSource(!showSource)}
          className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[var(--surface-sun)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[var(--lagoon)] to-[var(--clay)] flex items-center justify-center shrink-0">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--sea-ink)]">
                {t('persona.create.aiTitle')}
              </h3>
              <p className="text-xs text-[var(--sea-ink-soft)] opacity-60">
                {t('persona.create.aiSubtitle')}
              </p>
            </div>
          </div>
          {showSource ? (
            <ChevronUp size={18} className="text-[var(--sea-ink-soft)]" />
          ) : (
            <ChevronDown size={18} className="text-[var(--sea-ink-soft)]" />
          )}
        </button>

        {showSource && (
          <div className="px-4 pb-4 space-y-3 border-t border-[var(--line)]">
            <div className="pt-3">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(['resume', 'chat', 'social'] as const).map((type) => (
                  <span
                    key={type}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--surface-sun)] text-[var(--sea-ink-soft)] border border-[var(--line)]"
                  >
                    <FileText size={10} className="inline mr-1" />
                    {t(`persona.create.sourceType.${type}`)}
                  </span>
                ))}
              </div>
              <textarea
                className="form-field min-h-[140px] resize-y"
                placeholder={t('persona.create.sourcePlaceholder')}
                maxLength={50000}
                rows={6}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
              />
              <p className="text-xs text-[var(--sea-ink-soft)] mt-1">
                {t('common.charCount', { current: sourceText.length, max: 50000 })}
              </p>
            </div>

            {buildError && <ErrorDisplay error={buildError} />}

            <button
              type="button"
              onClick={handleBuild}
              className="btn-primary w-full"
              disabled={isBuilding || !sourceText.trim()}
            >
              {isBuilding ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('persona.create.building')}
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  {t('persona.create.buildSubmit')}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--line)]" />
        <span className="text-xs font-medium text-[var(--sea-ink-soft)] opacity-50 uppercase tracking-widest">
          {t('persona.create.orManual')}
        </span>
        <div className="flex-1 h-px bg-[var(--line)]" />
      </div>

      {/* Manual Create Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Display Name (read-only, from user account) */}
        <div>
          <label className="block text-sm font-semibold text-[var(--sea-ink)] mb-1.5">
            {t('persona.create.nameLabel')}
          </label>
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--surface)]">
            <User size={16} className="text-[var(--sea-ink-soft)] shrink-0" />
            <span className="text-[0.9375rem] text-[var(--sea-ink)] font-medium">
              {displayName}
            </span>
          </div>
          <p className="text-xs text-[var(--sea-ink-soft)] mt-1 opacity-60">
            {t('persona.create.nameFromAccount')}
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

          {presetTraits.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-[var(--sea-ink-soft)] opacity-60 mb-1.5">
                {t('persona.create.presetHint')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {presetTraits.map((preset) => {
                  const selected = traits.includes(preset.value)
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => togglePresetTrait(preset)}
                      disabled={!selected && traits.length >= 20}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        selected
                          ? 'bg-[var(--lagoon)] text-white border-[var(--lagoon)]'
                          : 'bg-[var(--surface)] text-[var(--sea-ink-soft)] border-[var(--line)] hover:border-[var(--lagoon)] hover:text-[var(--lagoon)]'
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
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
              onClick={() => addTrait()}
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
          disabled={isPending || !displayName}
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
    </div>
  )
}
