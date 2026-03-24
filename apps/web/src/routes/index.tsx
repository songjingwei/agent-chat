import { createFileRoute } from '@tanstack/react-router'
import { DiscoveryPlaza } from '#/features/personas/DiscoveryPlaza'
import { queryKeys } from '#/lib/query-keys'
import { fetchPersonas } from '#/lib/server-fns'

export const Route = createFileRoute('/')({
  loader: async ({ context }) => {
    const excludeUserId = context.auth.user?.id
    const listInput = { excludeUserId, limit: 24 }
    await context.queryClient.ensureQueryData({
      queryKey: queryKeys.personas.list(listInput),
      queryFn: () => fetchPersonas({ data: listInput }),
    })
  },
  component: HomePage,
})

function HomePage() {
  return (
    <main className="page-wrap py-4">
      <DiscoveryPlaza />
    </main>
  )
}
