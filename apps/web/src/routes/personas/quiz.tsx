import { createFileRoute, redirect } from '@tanstack/react-router'
import { SoulQuiz } from '#/features/personas/SoulQuiz'

export const Route = createFileRoute('/personas/quiz')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: SoulQuiz,
})
