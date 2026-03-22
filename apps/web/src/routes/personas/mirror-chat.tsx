import { createFileRoute, redirect } from '@tanstack/react-router'
import { MirrorChat } from '#/features/personas/MirrorChat'

export const Route = createFileRoute('/personas/mirror-chat')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: MirrorChat,
})
