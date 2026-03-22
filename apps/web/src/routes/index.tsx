import { createFileRoute } from '@tanstack/react-router'
import { DiscoveryPlaza } from '#/features/personas/DiscoveryPlaza'
import { queryKeys } from '#/lib/query-keys'
import { fetchPersonas } from '#/lib/server-fns'

export const Route = createFileRoute('/')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: queryKeys.personas.list(),
      queryFn: () => fetchPersonas(),
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
