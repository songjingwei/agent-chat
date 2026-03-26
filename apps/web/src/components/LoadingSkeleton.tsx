interface LoadingSkeletonProps {
  variant?: 'card' | 'list-item' | 'message' | 'mirror'
  count?: number
}

function SkeletonMirror() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6 w-full max-w-md mx-auto rise-in">
      <div className="relative">
        <div className="skeleton h-32 w-32 rounded-full" />
        <div
          className="absolute -inset-3 rounded-full"
          style={{
            border: '1px solid var(--line)',
            animation: 'pulse-soft 2s ease-in-out infinite',
          }}
        />
      </div>

      <div className="space-y-3 w-full px-4 flex flex-col items-center">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton h-3 w-48" />
        <div className="skeleton h-3 w-36" />
      </div>

      <div className="flex gap-3 w-full px-4 justify-center">
        <div className="skeleton h-10 w-28 rounded-xl" />
        <div className="skeleton h-10 w-28 rounded-xl" />
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div
      className="rounded-[1.75rem] border p-5 space-y-4"
      style={{
        borderColor: 'var(--card-border)',
        background: 'linear-gradient(165deg, var(--card-bg-strong), var(--card-bg))',
      }}
    >
      {/* Avatar + name row */}
      <div className="flex items-start gap-4">
        <div className="skeleton h-14 w-14 shrink-0 rounded-[1.2rem]" />
        <div className="flex-1 space-y-2.5 pt-1">
          <div className="skeleton h-5 w-2/5" />
          <div className="skeleton h-2.5 w-24 rounded-sm" />
        </div>
      </div>

      {/* Bio lines */}
      <div className="space-y-2">
        <div className="skeleton h-3 w-full rounded-sm" />
        <div className="skeleton h-3 w-4/5 rounded-sm" />
      </div>

      {/* Trait chips */}
      <div className="flex gap-2 pt-0.5">
        <div className="skeleton h-7 w-14 rounded-full" />
        <div className="skeleton h-7 w-16 rounded-full" />
        <div className="skeleton h-7 w-12 rounded-full" />
      </div>
    </div>
  )
}

function SkeletonListItem() {
  return (
    <div
      className="flex items-center gap-3.5 rounded-2xl border p-4"
      style={{
        borderColor: 'var(--card-border)',
        background: 'var(--card-bg)',
      }}
    >
      <div className="skeleton h-11 w-11 rounded-[0.85rem] shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="skeleton h-4 w-2/5" />
        <div className="skeleton h-3 w-3/5 rounded-sm" />
      </div>
      <div className="skeleton h-6 w-14 rounded-full shrink-0" />
    </div>
  )
}

function SkeletonMessage({ align }: { align: 'left' | 'right' }) {
  const widthClass = align === 'left' ? 'w-3/5' : 'w-2/5'
  const heightClass = align === 'left' ? 'h-16' : 'h-11'
  return (
    <div className={`flex ${align === 'right' ? 'justify-end' : ''}`}>
      <div className={`skeleton ${heightClass} ${widthClass} rounded-2xl`} />
    </div>
  )
}

function SkeletonMessageGroup() {
  return (
    <div className="flex flex-col gap-3 px-4">
      <SkeletonMessage align="left" />
      <SkeletonMessage align="right" />
      <SkeletonMessage align="left" />
    </div>
  )
}

const variants = {
  card: SkeletonCard,
  'list-item': SkeletonListItem,
  message: SkeletonMessageGroup,
  mirror: SkeletonMirror,
}

export function LoadingSkeleton({ variant = 'card', count = 1 }: LoadingSkeletonProps) {
  const Component = variants[variant]
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} style={{ animationDelay: `${i * 120}ms` }} className="rise-in">
          <Component />
        </div>
      ))}
    </>
  )
}
