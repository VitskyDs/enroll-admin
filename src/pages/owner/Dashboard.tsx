import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOwnerDashboard } from '@/hooks/useOwnerDashboard'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string
  value: string | number
  loading: boolean
}) {
  return (
    <div className="rounded-lg border bg-card p-5 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      {loading ? (
        <Skeleton className="h-8 w-20 mt-1" />
      ) : (
        <span className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</span>
      )}
    </div>
  )
}

function LoyaltyStrengthCard({ score, delta, loading }: { score: number; delta: number | null; loading: boolean }) {
  const trendIcon =
    delta === null ? <Minus size={14} className="text-muted-foreground" /> :
    delta > 0 ? <TrendingUp size={14} className="text-emerald-500" /> :
    delta < 0 ? <TrendingDown size={14} className="text-red-500" /> :
    <Minus size={14} className="text-muted-foreground" />

  const trendLabel =
    delta === null ? null :
    delta > 0 ? `+${delta} vs last month` :
    delta < 0 ? `${delta} vs last month` :
    'No change vs last month'

  return (
    <div className="rounded-lg border bg-card p-5 flex flex-col gap-1 col-span-full sm:col-span-2">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Loyalty strength</span>
      {loading ? (
        <div className="flex items-end gap-3 mt-1">
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-4 w-24 mb-1" />
        </div>
      ) : (
        <div className="flex items-end gap-3">
          <span className="text-4xl font-semibold tabular-nums">{score}</span>
          <span className="text-sm text-muted-foreground mb-1">/&nbsp;100</span>
          {trendLabel && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
              {trendIcon}
              {trendLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function CatchUpBanner({ count, loading }: { count: number; loading: boolean }) {
  if (loading) {
    return <Skeleton className="h-16 w-full rounded-lg" />
  }

  if (count === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-card px-5 py-4">
        <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
        <span className="text-sm font-medium">All customers are engaged</span>
      </div>
    )
  }

  return (
    <Link
      to="/owner/catch-up"
      className="flex items-center gap-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 px-5 py-4 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors group"
    >
      <AlertTriangle size={20} className="text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium">
          {count} {count === 1 ? 'customer needs' : 'customers need'} your attention
        </span>
      </div>
      <span className="flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-400 shrink-0 group-hover:gap-2 transition-all">
        Catch up <ArrowRight size={14} />
      </span>
    </Link>
  )
}

export default function OwnerDashboard() {
  const { stats, loading } = useOwnerDashboard()

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <CatchUpBanner count={stats?.atRiskCount ?? 0} loading={loading} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <LoyaltyStrengthCard
          score={stats?.loyaltyStrength ?? 0}
          delta={stats?.loyaltyStrengthDelta ?? null}
          loading={loading}
        />
        <StatCard label="Active members" value={stats?.activeMembers ?? 0} loading={loading} />
        <StatCard label="Total members" value={stats?.totalMembers ?? 0} loading={loading} />
        <StatCard label="Points issued this month" value={stats?.pointsIssuedThisMonth ?? 0} loading={loading} />
        <StatCard label="Redemptions this month" value={stats?.redemptionsThisMonth ?? 0} loading={loading} />
        <StatCard label="New members this week" value={stats?.newMembersThisWeek ?? 0} loading={loading} />
      </div>
    </div>
  )
}
