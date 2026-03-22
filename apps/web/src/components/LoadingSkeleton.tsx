interface LoadingSkeletonProps {
  variant?: 'card' | 'list-item' | 'message' | 'mirror'
  count?: number
}

function SkeletonMirror() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-8 w-full max-w-md mx-auto">
      {/* 中心能量球 */}
      <div className="relative">
        <div className="skeleton h-48 w-48 rounded-full opacity-40 animate-pulse bg-[var(--lagoon)]" />
        <div className="absolute inset-0 rounded-full border-2 border-[var(--lagoon)] animate-ping opacity-20" />
      </div>
      
      <div className="space-y-4 w-full px-4 text-center">
        <div className="skeleton h-6 w-1/3 mx-auto" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-5/6 mx-auto" />
      </div>

      <div className="grid grid-cols-2 gap-4 w-full px-4">
        <div className="skeleton h-12 rounded-2xl" />
        <div className="skeleton h-12 rounded-2xl" />
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="island-shell rounded-2xl p-5 space-y-3">
      <div className="skeleton h-5 w-2/5" />
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-4/5" />
      <div className="flex gap-2 pt-1">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
      </div>
    </div>
  )
}

function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-[var(--line)]">
      <div className="skeleton h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-1/3" />
        <div className="skeleton h-3 w-2/3" />
      </div>
      <div className="skeleton h-5 w-16 rounded-full" />
    </div>
  )
}

function SkeletonMessage() {
  return (
    <div className="flex flex-col gap-3 px-4">
      <div className="skeleton h-12 w-3/5 rounded-xl" />
      <div className="skeleton h-10 w-2/5 rounded-xl ml-auto" />
      <div className="skeleton h-14 w-3/4 rounded-xl" />
    </div>
  )
}

const variants = {
  card: SkeletonCard,
  'list-item': SkeletonListItem,
  message: SkeletonMessage,
  mirror: SkeletonMirror,
}

export function LoadingSkeleton({ variant = 'card', count = 1 }: LoadingSkeletonProps) {
  const Component = variants[variant]
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Component key={i} />
      ))}
    </>
  )
}
