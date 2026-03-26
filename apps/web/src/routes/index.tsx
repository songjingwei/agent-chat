import { createFileRoute } from '@tanstack/react-router'
import { DiscoveryPlaza } from '#/features/personas/DiscoveryPlaza'
import { buildPlazaSeed } from '#/features/personas/plaza-seed'
import { queryKeys } from '#/lib/query-keys'
import { fetchMyPersonas, fetchPersonas } from '#/lib/server-fns'

export const Route = createFileRoute('/')({
  loader: async ({ context }) => {
    const excludeUserId = context.auth.user?.id
    const seed = buildPlazaSeed(excludeUserId)
    let viewerPersonaId: string | undefined

    if (context.auth.user) {
      const myPersonas = await context.queryClient.ensureQueryData({
        queryKey: queryKeys.personas.mine(),
        queryFn: () => fetchMyPersonas(),
      })
      viewerPersonaId = myPersonas.items[0]?.id
    }

    if (viewerPersonaId) {
      const chattedInput = {
        viewerPersonaId,
        relationshipFilter: 'chatted' as const,
        limit: 18,
        seed,
      }
      const discoveryInput = {
        viewerPersonaId,
        relationshipFilter: 'new' as const,
        limit: 12,
        seed,
      }

      await Promise.all([
        context.queryClient.ensureQueryData({
          queryKey: queryKeys.personas.list(chattedInput),
          queryFn: () => fetchPersonas({ data: chattedInput }),
        }),
        context.queryClient.ensureQueryData({
          queryKey: queryKeys.personas.list(discoveryInput),
          queryFn: () => fetchPersonas({ data: discoveryInput }),
        }),
      ])
      return
    }

    const listInput = { excludeUserId, limit: 12, seed }
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
