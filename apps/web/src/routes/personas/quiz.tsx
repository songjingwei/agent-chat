import { createFileRoute, redirect } from '@tanstack/react-router'
import { SoulQuiz } from '#/features/personas/SoulQuiz'
import { queryKeys } from '#/lib/query-keys'
import { fetchMyPersonas } from '#/lib/server-fns'

export const Route = createFileRoute('/personas/quiz')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  loader: async ({ context }) => {
    const myPersonas = await context.queryClient.ensureQueryData({
      queryKey: queryKeys.personas.mine(),
      queryFn: () => fetchMyPersonas(),
    })

    if (myPersonas.items.length === 0) {
      throw redirect({ to: '/personas' })
    }
  },
  component: SoulQuiz,
})
