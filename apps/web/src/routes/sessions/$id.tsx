import { createFileRoute, redirect } from '@tanstack/react-router'
import { ChatRoom } from '#/features/sessions/ChatRoom'
import { ChatSessionSidebar } from '#/features/sessions/ChatSessionSidebar'
import { queryKeys } from '#/lib/query-keys'
import { fetchSession, fetchSessions } from '#/lib/server-fns'

export const Route = createFileRoute('/sessions/$id')({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: queryKeys.sessions.detail(params.id),
        queryFn: () => fetchSession({ data: params.id }),
      }),
      context.queryClient.ensureQueryData({
        queryKey: queryKeys.sessions.list(),
        queryFn: () => fetchSessions(),
      }),
    ])
  },
  component: ChatRoomPage,
})

function ChatRoomPage() {
  const { id } = Route.useParams()

  return (
    <main className="flex-1">
      <div className="mx-auto flex h-[calc(100dvh-64px)] max-w-[1280px] gap-3 px-2 py-2 sm:px-3 sm:py-3">
        <ChatSessionSidebar activeSessionId={id} />
        <section className="island-shell min-w-0 flex-1 overflow-hidden">
          <ChatRoom sessionId={id} />
        </section>
      </div>
    </main>
  )
}
