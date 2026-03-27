import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '#/components/ConfirmDialog'
import { EmptyState } from '#/components/EmptyState'
import { ErrorDisplay } from '#/components/ErrorDisplay'
import { LoadingSkeleton } from '#/components/LoadingSkeleton'
import { useMyPersonas } from './useMyPersonas'
import { useDeletePersona } from './useDeletePersona'
import { Sparkles, BrainCircuit, MessageSquareText, Trash2 } from 'lucide-react'

export function MyPersonasList() {
  const { t } = useTranslation()
  const { personas, isLoading, error } = useMyPersonas()
  const {
    showConfirm,
    openConfirm,
    closeConfirm,
    deletePersona,
    isDeleting,
  } = useDeletePersona()

  if (error) return <ErrorDisplay error={error} />

  if (isLoading) {
    return <LoadingSkeleton variant="mirror" />
  }

  // 即使有多个，由于一人一魂的设计哲学，我们只取第一个作为唯一的灵魂镜像展示
  const soulMirror = personas[0]

  if (!soulMirror) {
    return (
      <EmptyState
        icon={<Sparkles size={40} className="text-[var(--lagoon)]" />}
        title={t('persona.noAgents')}
        description={t('persona.noAgentsDesc')}
        action={{ label: t('persona.createAgent'), href: '/personas/create' }}
      />
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-6 w-full max-w-2xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* 1. 灵魂核心可视化展示区 */}
      <div className="relative group w-full flex flex-col items-center">
        {/* 中心光晕能量球 */}
        <div className="relative h-64 w-64 md:h-80 md:w-80 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[var(--lagoon)] via-[var(--palm)] to-[var(--clay)] opacity-20 blur-3xl animate-pulse" />
          <div className="absolute inset-4 rounded-full border border-[var(--line)] opacity-30 animate-[spin_20s_linear_infinite]" />
          <div className="absolute inset-12 rounded-full border border-[var(--line)] opacity-20 animate-[spin_15s_linear_infinite_reverse]" />
          
          {/* 核心灵魂球 */}
          <div className="relative z-10 h-32 w-32 md:h-40 md:w-40 rounded-full bg-gradient-to-tr from-[var(--lagoon)] to-[var(--clay)] flex items-center justify-center shadow-2xl shadow-[var(--lagoon-soft)]">
            <span className="text-4xl md:text-5xl font-bold text-white drop-shadow-md">
              {soulMirror.displayName.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* 动态特质气泡 (模拟参数可视化) */}
          {soulMirror.traits.slice(0, 6).map((trait, i) => {
            const angle = (i / 6) * Math.PI * 2
            const radius = 140
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            return (
              <div
                key={trait}
                className="absolute px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--line)] text-xs font-medium text-[var(--sea-ink-soft)] shadow-sm hover:border-[var(--lagoon)] transition-colors duration-300"
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                }}
              >
                {trait}
              </div>
            )
          })}
        </div>

        {/* 2. 镜像基本信息 (不可手动编辑) */}
        <div className="mt-8 text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--sea-ink)]">
            {soulMirror.displayName}
          </h2>
          <p className="text-[var(--sea-ink-soft)] opacity-70 max-w-sm italic">
            "{soulMirror.bio || t('persona.create.subtitle')}"
          </p>
        </div>
      </div>

      {/* 3. 协同进化功能区 (唯一调整参数的途径) */}
      <div className="w-full space-y-4">
        <div className="flex flex-col items-center gap-1 mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--clay)]">
            {t('persona.evolve.title')}
          </span>
          <p className="text-sm text-[var(--sea-ink-soft)] opacity-60">
            {t('persona.evolve.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 心灵测试入口 */}
          <Link
            to="/personas/quiz"
            className="flex items-start gap-4 p-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--lagoon)] hover:bg-[var(--surface-sun)] transition-all group text-left no-underline"
          >
            <div className="h-12 w-12 rounded-xl bg-[var(--surface-sun)] flex items-center justify-center shrink-0 border border-[var(--line)] group-hover:border-[var(--lagoon)] group-hover:scale-110 transition-transform">
              <BrainCircuit className="text-[var(--lagoon)]" size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-[var(--sea-ink)] group-hover:text-[var(--lagoon)]">
                {t('persona.evolve.quiz')}
              </h4>
              <p className="text-xs text-[var(--sea-ink-soft)] opacity-70 leading-relaxed">
                {t('persona.evolve.quizDesc')}
              </p>
            </div>
          </Link>

          {/* 镜像对话入口 */}
          <Link
            to="/personas/mirror-chat"
            className="flex items-start gap-4 p-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--lagoon)] hover:bg-[var(--surface-sun)] transition-all group text-left no-underline"
          >
            <div className="h-12 w-12 rounded-xl bg-[var(--surface-sun)] flex items-center justify-center shrink-0 border border-[var(--line)] group-hover:border-[var(--clay)] group-hover:scale-110 transition-transform">
              <MessageSquareText className="text-[var(--clay)]" size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-[var(--sea-ink)] group-hover:text-[var(--clay)]">
                {t('persona.evolve.chat')}
              </h4>
              <p className="text-xs text-[var(--sea-ink-soft)] opacity-70 leading-relaxed">
                {t('persona.evolve.chatDesc')}
              </p>
            </div>
          </Link>

          {/* 删除镜像入口 */}
          <button
            type="button"
            onClick={openConfirm}
            className="flex items-start gap-4 p-5 rounded-2xl border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--clay)] hover:bg-[var(--surface-sun)] transition-all group text-left md:col-span-2"
          >
            <div className="h-12 w-12 rounded-xl bg-[var(--surface-sun)] flex items-center justify-center shrink-0 border border-[var(--line)] group-hover:border-[var(--clay)] group-hover:scale-110 transition-transform">
              <Trash2 className="text-[var(--sea-ink-soft)] group-hover:text-[var(--clay)]" size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-[var(--sea-ink)] group-hover:text-[var(--clay)]">
                {t('persona.evolve.delete')}
              </h4>
              <p className="text-xs text-[var(--sea-ink-soft)] opacity-70 leading-relaxed">
                {t('persona.evolve.deleteDesc')}
              </p>
            </div>
          </button>
        </div>
      </div>

      <p className="text-[0.6875rem] text-[var(--sea-ink-soft)] opacity-30 mt-8 italic text-center">
        {t('persona.realPerson')}
      </p>

      <ConfirmDialog
        isOpen={showConfirm}
        isSubmitting={isDeleting}
        kicker={t('persona.delete.kicker')}
        title={t('persona.delete.title')}
        description={t('persona.delete.description')}
        cancelLabel={t('persona.delete.cancel')}
        confirmLabel={t('persona.delete.confirm')}
        confirmingLabel={t('persona.delete.confirming')}
        onCancel={closeConfirm}
        onConfirm={() => deletePersona(soulMirror.id)}
      />
    </div>
  )
}
