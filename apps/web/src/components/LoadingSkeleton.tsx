interface LoadingSkeletonProps {
  variant?: 'card' | 'list-item' | 'message'
  count?: number
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
