import { createFileRoute, redirect } from '@tanstack/react-router'
import { ChatRoom } from '#/features/sessions/ChatRoom'

export const Route = createFileRoute('/sessions/$id')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: ChatRoomPage,
})

function ChatRoomPage() {
  const { id } = Route.useParams()
  return (
    <main className="flex-1">
      <ChatRoom sessionId={id} />
    </main>
  )
}
