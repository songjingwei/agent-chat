import { useTranslation } from 'react-i18next'
import { useSoulQuiz } from './useSoulQuiz'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { ErrorDisplay } from '#/components/ErrorDisplay'
import { LoadingSkeleton } from '#/components/LoadingSkeleton'

export function SoulQuiz() {
  const { t } = useTranslation()
  const {
    currentQuestion,
    currentStep,
    error,
    isLoading,
    isCompleted,
    isCalculating,
    isAnswering,
    resultSummary,
    traits,
    handleSelect,
    goToPersonas,
    totalSteps,
  } = useSoulQuiz()

  if (error) {
    return (
      <main className="page-wrap py-12">
        <div className="max-w-lg mx-auto space-y-6">
          <ErrorDisplay error={error} />
          <div className="flex justify-center">
            <Link to="/personas" className="btn-ghost no-underline">
              返回镜像页
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (isLoading) {
    return (
      <main className="page-wrap py-12">
        <LoadingSkeleton variant="mirror" />
      </main>
    )
  }

  if (isCalculating) {
    return (
      <main className="page-wrap py-12">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
          <div className="relative">
            <div className="h-20 w-20 rounded-full border-2 border-[var(--lagoon)] border-t-transparent animate-spin" />
            <Sparkles
              size={28}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--lagoon)]"
            />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-[var(--sea-ink)]">
              {t('persona.quiz.calculating')}
            </p>
            <p className="text-sm text-[var(--sea-ink-soft)] opacity-60">
              正在融合你的回答，绘制灵魂图谱…
            </p>
          </div>
        </div>
      </main>
    )
  }

  if (isCompleted) {
    const topTraits = traits.slice(0, 3)
    return (
      <main className="page-wrap py-8 sm:py-12">
        <div className="max-w-lg mx-auto space-y-8 rise-in">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex h-16 w-16 rounded-full bg-gradient-to-br from-[var(--lagoon)] to-[var(--clay)] items-center justify-center mx-auto">
              <Sparkles size={28} className="text-white" />
            </div>
            <h2 className="display-title text-2xl sm:text-3xl font-bold text-[var(--sea-ink)]">
              {t('persona.quiz.resultTitle')}
            </h2>
            <p className="text-sm text-[var(--sea-ink-soft)] max-w-sm mx-auto leading-relaxed">
              {resultSummary || t('persona.quiz.resultDesc')}
            </p>
          </div>

          {/* Top traits highlight */}
          <div className="island-shell rounded-2xl p-6 space-y-5">
            <h3 className="island-kicker">你的灵魂特质</h3>
            <div className="space-y-4">
              {topTraits.map((trait, i) => (
                <div key={trait.name} className="rise-in" style={{ animationDelay: `${i * 120}ms` }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-[var(--sea-ink)]">
                      {trait.label}
                    </span>
                    <span className="text-xs text-[var(--sea-ink-soft)]">
                      {Math.round((trait.score / trait.maxScore) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[var(--line)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${(trait.score / trait.maxScore) * 100}%`,
                        background: `linear-gradient(90deg, var(--lagoon), var(--clay))`,
                        animationDelay: `${i * 200}ms`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-[var(--sea-ink-soft)] mt-1 leading-relaxed">
                    {trait.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* All traits */}
          {traits.length > 3 && (
            <div className="island-shell rounded-2xl p-6 space-y-4 rise-in" style={{ animationDelay: '400ms' }}>
              <h3 className="island-kicker">其他维度</h3>
              <div className="grid grid-cols-2 gap-3">
                {traits.slice(3).map((trait) => (
                  <div
                    key={trait.name}
                    className="flex items-center gap-2 p-3 rounded-xl border border-[var(--line)] bg-[var(--surface)]"
                  >
                    <div className="h-2 w-2 rounded-full bg-[var(--lagoon)]" />
                    <div>
                      <span className="text-xs font-semibold text-[var(--sea-ink)]">
                        {trait.label}
                      </span>
                      <span className="text-xs text-[var(--sea-ink-soft)] ml-1">
                        {Math.round((trait.score / trait.maxScore) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 rise-in" style={{ animationDelay: '500ms' }}>
            <button onClick={goToPersonas} className="btn-primary flex-1 py-3 no-underline justify-center">
              {t('persona.quiz.complete')}
            </button>
            <Link
              to="/personas/mirror-chat"
              className="btn-ghost flex-1 py-3 no-underline text-center justify-center"
            >
              继续镜像对话
            </Link>
          </div>
        </div>
      </main>
    )
  }
  if (!currentQuestion) {
    return (
      <main className="page-wrap py-12">
        <div className="max-w-lg mx-auto space-y-6">
          <ErrorDisplay error={new Error('No active assessment question available.')} />
        </div>
      </main>
    )
  }

  return (
    <main className="page-wrap py-8 sm:py-12">
      <div className="max-w-xl mx-auto space-y-10">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/personas"
            className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--link-bg-hover)] no-underline"
            aria-label="返回"
          >
            <ArrowLeft size={18} className="text-[var(--sea-ink-soft)]" />
          </Link>
          <span className="text-xs font-bold text-[var(--sea-ink-soft)] uppercase tracking-widest">
            {t('persona.quiz.questionCount', { current: currentStep + 1, total: totalSteps })}
          </span>
        </div>

        {/* Title */}
        <div className="space-y-2 text-center rise-in">
          <span className="island-kicker">{t('persona.quiz.title')}</span>
          <p className="text-sm text-[var(--sea-ink-soft)] opacity-70">
            {t('persona.quiz.subtitle')}
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full bg-[var(--line)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--lagoon)] to-[var(--clay)] transition-all duration-500"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div key={currentQuestion.id} className="space-y-6 rise-in">
          <h3 className="text-lg font-medium text-[var(--sea-ink)] text-center leading-relaxed px-4">
            {currentQuestion.text}
          </h3>

          <div className="space-y-3">
            {currentQuestion.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(currentQuestion.id, option.value)}
                disabled={isAnswering}
                className="w-full p-4 sm:p-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--lagoon)] hover:bg-[var(--surface-sun)] transition-all text-left text-sm text-[var(--sea-ink)] font-medium active:scale-[0.98]"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
