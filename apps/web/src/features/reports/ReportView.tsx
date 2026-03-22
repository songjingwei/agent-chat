import { StatusBadge } from '#/components/StatusBadge'
import { ErrorDisplay } from '#/components/ErrorDisplay'
import { LoadingSkeleton } from '#/components/LoadingSkeleton'
import { useReport } from './useReport'
import { Link } from '@tanstack/react-router'
import { MessageSquare, TrendingUp, FileText } from 'lucide-react'

interface ReportViewProps {
  personaId: string
}

export function ReportView({ personaId }: ReportViewProps) {
  const { report, isLoading, error } = useReport(personaId)

  if (error) return <ErrorDisplay error={error} />

  if (isLoading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton variant="card" count={2} />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="island-shell rounded-2xl p-6 text-center">
        <FileText size={36} className="mx-auto text-[var(--sea-ink-soft)] opacity-40 mb-3" />
        <p className="text-sm text-[var(--sea-ink-soft)]">
          No report available for this persona yet.
        </p>
      </div>
    )
  }

  const generatedDate = new Date(report.generatedAt).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          icon={<MessageSquare size={18} />}
          label="Messages"
          value={String(report.totalMessages)}
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Status"
          value={<StatusBadge status={report.sessionStatus} />}
        />
        <div className="col-span-2 sm:col-span-1">
          <StatCard
            icon={<FileText size={18} />}
            label="Generated"
            value={generatedDate}
          />
        </div>
      </div>

      {/* Recommendation */}
      <div className="island-shell rounded-2xl p-6">
        <h3 className="island-kicker mb-3">Recommendation</h3>
        <p className="text-base text-[var(--sea-ink)] leading-relaxed">
          {report.recommendation}
        </p>
      </div>

      {/* Rationale */}
      <div className="island-shell rounded-2xl p-6">
        <h3 className="island-kicker mb-3">Rationale</h3>
        <p className="text-sm text-[var(--sea-ink-soft)] leading-relaxed">
          {report.rationale}
        </p>
      </div>

      {/* Latest message preview */}
      {report.latestMessagePreview && (
        <div className="island-shell rounded-2xl p-6">
          <h3 className="island-kicker mb-3">Latest Message</h3>
          <p className="text-sm text-[var(--sea-ink)] italic">
            "{report.latestMessagePreview}"
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          to="/sessions/$id"
          params={{ id: report.sessionId }}
          className="btn-primary"
        >
          View Conversation
        </Link>
        <Link to="/" className="btn-ghost">
          Back to Plaza
        </Link>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="feature-card border border-[var(--line)] rounded-xl p-4">
      <div className="flex items-center gap-2 text-[var(--sea-ink-soft)] mb-1">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="text-sm font-semibold text-[var(--sea-ink)]">{value}</div>
    </div>
  )
}
