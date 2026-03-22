import { createFileRoute, redirect } from '@tanstack/react-router'
import { ChatRoom } from '#/features/sessions/ChatRoom'
import { queryKeys } from '#/lib/query-keys'
import { fetchSession } from '#/lib/server-fns'

export const Route = createFileRoute('/sessions/$id')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData({
      queryKey: queryKeys.sessions.detail(params.id),
      queryFn: () => fetchSession({ data: params.id }),
    })
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
