import { createFileRoute } from '@tanstack/react-router'
import { DiscoveryPlaza } from '#/features/personas/DiscoveryPlaza'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="page-wrap py-4">
      <DiscoveryPlaza />
    </main>
  )
}
