import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

export interface QuizQuestion {
  id: string
  text: string
  options: { label: string; value: string; dimension: string; score: number }[]
}

export interface SoulTrait {
  name: string
  label: string
  score: number
  maxScore: number
  description: string
}

const MOCK_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    text: '在喧嚣的聚会中，你发现窗外有一片静谧的森林，你会：',
    options: [
      { label: '继续留在人群中，享受当下的热闹', value: 'a', dimension: 'sociability', score: 5 },
      { label: '独自走到窗前，静静观察那片森林', value: 'b', dimension: 'introspection', score: 5 },
      { label: '邀请几位好友一起去森林探险', value: 'c', dimension: 'adventurousness', score: 5 },
    ],
  },
  {
    id: 'q2',
    text: '面对一个从未见过的新奇事物，你的第一反应是：',
    options: [
      { label: '分析它的原理和运作逻辑', value: 'a', dimension: 'analytical', score: 5 },
      { label: '感受它带给你的直觉与美感', value: 'b', dimension: 'aesthetic', score: 5 },
      { label: '想象它在未来无限的可能', value: 'c', dimension: 'imaginative', score: 5 },
    ],
  },
  {
    id: 'q3',
    text: '深夜，你独自坐在书桌前，这时你最可能在做什么？',
    options: [
      { label: '写下今天的所思所想，与自己对话', value: 'a', dimension: 'introspection', score: 4 },
      { label: '看一部能引起共鸣的电影或纪录片', value: 'b', dimension: 'empathy', score: 4 },
      { label: '规划明天或下周的行动方案', value: 'c', dimension: 'analytical', score: 4 },
      { label: '随机翻看一本从未触碰的书', value: 'd', dimension: 'adventurousness', score: 4 },
    ],
  },
  {
    id: 'q4',
    text: '当朋友向你倾诉烦恼时，你通常会：',
    options: [
      { label: '先安静倾听，试图感受对方的情绪', value: 'a', dimension: 'empathy', score: 5 },
      { label: '快速分析问题，给出解决建议', value: 'b', dimension: 'analytical', score: 5 },
      { label: '分享自己的类似经历，拉近距离', value: 'c', dimension: 'sociability', score: 5 },
    ],
  },
  {
    id: 'q5',
    text: '如果可以选择一种超能力，你会选：',
    options: [
      { label: '读懂所有人内心深处的真实想法', value: 'a', dimension: 'empathy', score: 4 },
      { label: '瞬间掌握任何领域的知识', value: 'b', dimension: 'analytical', score: 4 },
      { label: '自由穿梭于不同的平行宇宙', value: 'c', dimension: 'adventurousness', score: 4 },
      { label: '将脑海中的画面变为现实', value: 'd', dimension: 'imaginative', score: 5 },
    ],
  },
  {
    id: 'q6',
    text: '旅行时，你更倾向于：',
    options: [
      { label: '深入当地人的生活，体验真实的烟火气', value: 'a', dimension: 'empathy', score: 4 },
      { label: '探访人迹罕至的秘境，追寻未知', value: 'b', dimension: 'adventurousness', score: 5 },
      { label: '在一个安静的角落坐下，观察和记录', value: 'c', dimension: 'aesthetic', score: 4 },
      { label: '参观博物馆和历史遗迹，了解背后的故事', value: 'd', dimension: 'analytical', score: 3 },
    ],
  },
  {
    id: 'q7',
    text: '在一个理想的周末，你最想做的事情是：',
    options: [
      { label: '邀请朋友到家里聚餐聊天', value: 'a', dimension: 'sociability', score: 5 },
      { label: '独自去美术馆或看一场话剧', value: 'b', dimension: 'aesthetic', score: 5 },
      { label: '报名一个完全没尝试过的课程', value: 'c', dimension: 'adventurousness', score: 4 },
      { label: '在公园散步，让思绪自由飘荡', value: 'd', dimension: 'introspection', score: 4 },
    ],
  },
  {
    id: 'q8',
    text: '当你创造了一件让自己满意的作品（文章、画、代码……），你最在意的是：',
    options: [
      { label: '它是否传达了我想表达的情感', value: 'a', dimension: 'aesthetic', score: 5 },
      { label: '它是否足够完善、逻辑自洽', value: 'b', dimension: 'analytical', score: 5 },
      { label: '它是否能引发别人的共鸣', value: 'c', dimension: 'empathy', score: 4 },
      { label: '它是否打破了某种边界或常规', value: 'd', dimension: 'imaginative', score: 5 },
    ],
  },
]

const DIMENSION_META: Record<string, { label: string; description: string }> = {
  sociability: { label: '共鸣之潮', description: '你天然地渴望与人连接，在交流中获得能量。' },
  introspection: { label: '深潜之镜', description: '你习惯向内探索，在独处中发现自我的真实面貌。' },
  adventurousness: { label: '探索之翼', description: '未知是你的引力，每一次出发都是灵魂的扩展。' },
  analytical: { label: '解构之匙', description: '你用理性的光照亮世界的纹理，在逻辑中找到秩序。' },
  aesthetic: { label: '感知之弦', description: '你对美有着敏锐的感知，能在细微处捕捉诗意。' },
  imaginative: { label: '造梦之境', description: '你的思维不受边界束缚，在想象中构建无限可能。' },
  empathy: { label: '共情之泉', description: '你能自然地感受他人的喜乐忧伤，是温柔的倾听者。' },
}

function calculateTraits(answers: Record<string, string>): SoulTrait[] {
  const scores: Record<string, number> = {}

  for (const [questionId, value] of Object.entries(answers)) {
    const question = MOCK_QUESTIONS.find((q) => q.id === questionId)
    if (!question) continue
    const option = question.options.find((o) => o.value === value)
    if (!option) continue
    scores[option.dimension] = (scores[option.dimension] || 0) + option.score
  }

  return Object.entries(scores)
    .map(([name, score]) => ({
      name,
      label: DIMENSION_META[name]?.label ?? name,
      score,
      maxScore: 15,
      description: DIMENSION_META[name]?.description ?? '',
    }))
    .sort((a, b) => b.score - a.score)
}

export function useSoulQuiz() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isCompleted, setIsCompleted] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [traits, setTraits] = useState<SoulTrait[]>([])
  const navigate = useNavigate()

  const handleSelect = (questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value }
    setAnswers(newAnswers)
    if (currentStep < MOCK_QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      setIsCalculating(true)
      setTimeout(() => {
        setTraits(calculateTraits(newAnswers))
        setIsCalculating(false)
        setIsCompleted(true)
      }, 2200)
    }
  }

  const goBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1)
  }

  const goToPersonas = () => {
    navigate({ to: '/personas' })
  }

  return {
    questions: MOCK_QUESTIONS,
    currentStep,
    answers,
    isCompleted,
    isCalculating,
    traits,
    handleSelect,
    goBack,
    goToPersonas,
    totalSteps: MOCK_QUESTIONS.length,
  }
}
