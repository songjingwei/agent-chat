import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  createAssessmentSession,
  getAssessmentResult,
  submitAssessmentAnswer,
} from '#/lib/api-client'
import { queryKeys } from '#/lib/query-keys'
import type { AssessmentQuestionOption } from '#/lib/types'
import { useMyPersonas } from './useMyPersonas'

export interface QuizQuestion {
  id: string
  text: string
  options: AssessmentQuestionOption[]
}

export interface SoulTrait {
  name: string
  label: string
  score: number
  maxScore: number
  description: string
}

const DIMENSION_META: Record<string, { label: string; description: string }> = {
  sociability: { label: '共鸣之潮', description: '你天然地渴望与人连接，在交流中获得能量。' },
  introspection: { label: '深潜之镜', description: '你习惯向内探索，在独处中发现自我的真实面貌。' },
  adventurousness: { label: '探索之翼', description: '未知是你的引力，每一次出发都是灵魂的扩展。' },
  analytical: { label: '解构之匙', description: '你用理性的光照亮世界的纹理，在逻辑中找到秩序。' },
  aesthetic: { label: '感知之弦', description: '你对美有着敏锐的感知，能在细微处捕捉诗意。' },
  imaginative: { label: '造梦之境', description: '你的思维不受边界束缚，在想象中构建无限可能。' },
  empathy: { label: '共情之泉', description: '你能自然地感受他人的喜乐忧伤，是温柔的倾听者。' },
}

function mapTraits(
  scores?: Array<{
    dimension: string
    label: string
    score: number
    normalizedScore: number
  }>,
): SoulTrait[] {
  if (!scores) return []

  return scores.map((entry) => ({
    name: entry.dimension,
    label: DIMENSION_META[entry.dimension]?.label ?? entry.label,
    score: entry.score,
    maxScore: 15,
    description: DIMENSION_META[entry.dimension]?.description ?? '',
  }))
}

export function useSoulQuiz() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isBrowser = typeof window !== 'undefined'
  const {
    personas,
    isLoading: personasLoading,
    error: personasError,
  } = useMyPersonas()

  const soulMirror = personas[0] ?? null

  useEffect(() => {
    if (!personasLoading && !soulMirror) {
      navigate({ to: '/personas' })
    }
  }, [navigate, personasLoading, soulMirror])

  const sessionQuery = useQuery({
    queryKey: queryKeys.assessments.bootstrap(soulMirror?.id ?? 'missing'),
    enabled: isBrowser && Boolean(soulMirror?.id),
    queryFn: () => createAssessmentSession({ personaId: soulMirror!.id }),
    staleTime: 0,
  })

  const session = sessionQuery.data ?? null

  const resultQuery = useQuery({
    queryKey: queryKeys.assessments.result(session?.id ?? 'missing'),
    enabled: isBrowser && Boolean(session?.id && session.resultReady),
    queryFn: () => getAssessmentResult(session!.id),
  })

  const answerMutation = useMutation({
    mutationFn: (input: { sessionId: string; sessionItemId: string; value: string }) =>
      submitAssessmentAnswer(input.sessionId, {
        sessionItemId: input.sessionItemId,
        selectedOptionValue: input.value,
      }),
    onSuccess: (nextSession) => {
      queryClient.setQueryData(
        queryKeys.assessments.bootstrap(nextSession.personaId),
        nextSession,
      )
      queryClient.setQueryData(
        queryKeys.assessments.session(nextSession.id),
        nextSession,
      )

      if (nextSession.resultReady) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.assessments.result(nextSession.id),
        })
      }
    },
  })

  const isCompleted =
    Boolean(session?.resultReady) &&
    (resultQuery.data?.status === 'completed' || resultQuery.data?.status === 'applied')

  const isCalculating =
    Boolean(session?.id) &&
    !isCompleted &&
    (session?.status === 'submitted' ||
      session?.status === 'interpreting' ||
      (Boolean(session?.resultReady) && resultQuery.isLoading))

  const currentQuestion: QuizQuestion | null = session?.currentItem
    ? {
      id: session.currentItem.sessionItemId,
      text: session.currentItem.questionText,
      options: session.currentItem.options,
    }
    : null

  const traits = mapTraits(resultQuery.data?.dimensionScores)

  const error =
    (personasError as Error | null) ??
    (sessionQuery.error as Error | null) ??
    (answerMutation.error as Error | null) ??
    (resultQuery.error as Error | null) ??
    null

  const goToPersonas = () => {
    navigate({ to: '/personas' })
  }

  return {
    currentQuestion,
    currentStep: session?.currentIndex ?? 0,
    totalSteps: session?.totalItems ?? 0,
    isLoading: personasLoading || !isBrowser || (Boolean(soulMirror?.id) && sessionQuery.isLoading),
    isAnswering: answerMutation.isPending,
    isCompleted,
    isCalculating,
    traits,
    resultSummary: resultQuery.data?.summary ?? null,
    error,
    handleSelect: (questionId: string, value: string) => {
      if (!session?.id) return
      answerMutation.mutate({
        sessionId: session.id,
        sessionItemId: questionId,
        value,
      })
    },
    goToPersonas,
  }
}
