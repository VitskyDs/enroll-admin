import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Minus, ArrowRight, AlertTriangle, CheckCircle2,
  Search, UserPlus, Sparkles, Send, ChevronRight, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@vitskyds/enroll-ui'
import { useOwnerDashboard, type RecentActivity } from '@/hooks/useOwnerDashboard'
import { useAuth } from '@/contexts/AuthContext'
import { AwardPointsDialog } from '@/components/owner/award-points-dialog'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  const days = Math.round(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function activityLabel(a: RecentActivity) {
  if (a.reason === 'redemption' || a.points < 0) return `Redeemed ${Math.abs(a.points)} points`
  return `Earned ${a.points} points`
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />
}

function StatCard({ label, value, sub, loading }: { label: string; value: number; sub?: string; loading: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-5 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
      {loading ? (
        <Skeleton className="h-8 w-20 mt-1" />
      ) : (
        <span className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</span>
      )}
      {sub && !loading && <span className="text-xs text-muted-foreground">{sub}</span>}
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
  if (loading) return <Skeleton className="h-16 w-full rounded-lg" />

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

function CustomerSearch() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    navigate(query.trim() ? `/owner/customers?q=${encodeURIComponent(query.trim())}` : '/owner/customers')
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Find a customer by name, phone or email…"
        className="pl-10 h-11"
        aria-label="Find a customer"
      />
    </form>
  )
}

function RecentActivityCard({ items, loading }: { items: RecentActivity[]; loading: boolean }) {
  return (
    <div className="rounded-lg border bg-card flex flex-col">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <span className="text-sm font-medium">Recent activity</span>
        <Link to="/owner/customers" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          View all <ChevronRight size={13} />
        </Link>
      </div>
      {loading ? (
        <div className="p-5 flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-muted-foreground">No activity yet</div>
      ) : (
        <ul className="divide-y">
          {items.map(a => (
            <li key={a.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex items-center justify-center size-8 rounded-full bg-muted text-[11px] font-semibold text-muted-foreground shrink-0">
                {initials(a.customerName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{a.customerName}</p>
                <p className="text-xs text-muted-foreground truncate">{activityLabel(a)}</p>
              </div>
              <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Clock size={11} /> {timeAgo(a.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const QUICK_ACTIONS = [
  { to: '/owner/customers', icon: UserPlus, title: 'Add a customer', desc: 'Register a walk-in or new member' },
  { to: null, icon: Sparkles, title: 'Award points manually', desc: 'Credit a customer for a visit' },
  { to: '/owner/catch-up', icon: Send, title: 'Send a catch-up message', desc: 'Re-engage lapsed customers' },
]

function QuickActionsCard({
  atRiskCount,
  loading,
  onAwardPoints,
}: {
  atRiskCount: number
  loading: boolean
  onAwardPoints: () => void
}) {
  return (
    <div className="rounded-lg border bg-card flex flex-col">
      <div className="border-b px-5 py-3">
        <span className="text-sm font-medium">Quick actions</span>
      </div>
      <ul className="divide-y">
        {QUICK_ACTIONS.map(({ to, icon: Icon, title, desc }) => {
          const inner = (
            <>
              <Icon size={16} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <ChevronRight size={15} className="text-muted-foreground shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </>
          )
          return (
            <li key={title}>
              {to ? (
                <Link to={to} className="flex items-center gap-3 px-5 py-3.5 hover:bg-button-ghost-bg-hover transition-colors group">
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={onAwardPoints}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-button-ghost-bg-hover transition-colors group text-left"
                >
                  {inner}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {!loading && atRiskCount > 0 && (
        <div className="border-t bg-muted/30 px-5 py-3 rounded-b-lg">
          <p className="text-xs">
            <span className="font-medium">{atRiskCount} customers</span>
            <span className="text-muted-foreground"> haven't visited recently. </span>
            <Link to="/owner/catch-up" className="font-medium underline underline-offset-2">View lapsed customers</Link>
          </p>
        </div>
      )}
    </div>
  )
}

export default function OwnerDashboard() {
  const { stats, businessName, recentActivity, loading, refresh } = useOwnerDashboard()
  const { ownedBusinessId } = useAuth()
  const [awardOpen, setAwardOpen] = useState(false)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {greeting()}{businessName ? `, ${businessName}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Here's what's happening with your loyalty program today.
        </p>
      </div>

      <CustomerSearch />

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2">
          <RecentActivityCard items={recentActivity} loading={loading} />
        </div>
        <QuickActionsCard
          atRiskCount={stats?.atRiskCount ?? 0}
          loading={loading}
          onAwardPoints={() => setAwardOpen(true)}
        />
      </div>

      {ownedBusinessId && (
        <AwardPointsDialog
          open={awardOpen}
          onOpenChange={setAwardOpen}
          businessId={ownedBusinessId}
          onSuccess={refresh}
        />
      )}
    </div>
  )
}
