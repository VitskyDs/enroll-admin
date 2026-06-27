import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Gift, Star, Bell, CheckCheck, Clock, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@vitskyds/enroll-ui'
import { Input } from '@vitskyds/enroll-ui'

type AtRiskCustomer = {
  id: string
  name: string
  tier: string | null
  points: number
  last_visit_at: string | null
  churn_risk_reason: string | null
}

type ActiveReward = {
  id: string
  name: string
  points_cost: number
}

type HistoryAction = {
  id: string
  action_type: 'gift_points' | 'send_reward' | 'send_reminder' | 'dismiss'
  points_gifted: number | null
  note: string | null
  created_at: string
  customer: { name: string } | null
  reward: { name: string } | null
}

type ActionType = 'gift_points' | 'send_reward' | 'dismiss'

function daysSince(dateStr: string | null): string {
  if (!dateStr) return 'Never visited'
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold text-xl shrink-0">
      {initials(name)}
    </div>
  )
}

function actionLabel(type: HistoryAction['action_type']) {
  if (type === 'gift_points') return 'Gifted points'
  if (type === 'send_reward') return 'Sent reward'
  if (type === 'send_reminder') return 'Sent reminder'
  return 'Dismissed'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── History tab ────────────────────────────────────────────────────────────

function HistoryTab({ businessId }: { businessId: string }) {
  const [actions, setActions] = useState<HistoryAction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('catch_up_actions')
        .select('*, customer:customers(name), reward:rewards(name)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
      setActions((data as HistoryAction[]) ?? [])
      setLoading(false)
    }
    load()
  }, [businessId])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading history…</span>
      </div>
    )
  }

  if (actions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No actions yet</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-lg mx-auto p-4 space-y-2">
        {actions.map(a => (
          <div key={a.id} className="flex items-start gap-3 rounded-lg border bg-card p-4">
            <div className="mt-0.5">
              {a.action_type === 'gift_points' && <Gift size={16} className="text-muted-foreground" />}
              {a.action_type === 'send_reward' && <Star size={16} className="text-muted-foreground" />}
              {a.action_type === 'dismiss' && <X size={16} className="text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate">{a.customer?.name ?? 'Unknown'}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatDate(a.created_at)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {actionLabel(a.action_type)}
                {a.action_type === 'gift_points' && a.points_gifted != null && ` · ${a.points_gifted} pts`}
                {a.action_type === 'send_reward' && a.reward?.name && ` · ${a.reward.name}`}
              </p>
              {a.note && <p className="text-xs text-muted-foreground mt-0.5 italic">"{a.note}"</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Customer card ───────────────────────────────────────────────────────────

function CustomerCard({
  customer,
  index,
  total,
  rewards,
  onAction,
  onPrev,
  submitting,
}: {
  customer: AtRiskCustomer
  index: number
  total: number
  rewards: ActiveReward[]
  onAction: (type: ActionType, extras: { points?: number; note?: string; rewardId?: string }) => void
  onPrev: () => void
  submitting: boolean
}) {
  const [actionType, setActionType] = useState<ActionType>('gift_points')
  const [giftPoints, setGiftPoints] = useState('')
  const [giftNote, setGiftNote] = useState('')
  const [rewardId, setRewardId] = useState(rewards[0]?.id ?? '')

  // Reset form when customer changes
  useEffect(() => {
    setActionType('gift_points')
    setGiftPoints('')
    setGiftNote('')
    setRewardId(rewards[0]?.id ?? '')
  }, [customer.id, rewards])

  function handleSubmit() {
    if (actionType === 'gift_points') {
      const pts = parseInt(giftPoints, 10)
      if (!pts || pts <= 0) return
      onAction('gift_points', { points: pts, note: giftNote || undefined })
    } else if (actionType === 'send_reward') {
      if (!rewardId) return
      onAction('send_reward', { rewardId })
    } else {
      onAction('dismiss', {})
    }
  }

  const canSubmit = actionType === 'dismiss'
    || (actionType === 'gift_points' && parseInt(giftPoints, 10) > 0)
    || (actionType === 'send_reward' && Boolean(rewardId))

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 overflow-y-auto">
      {/* Progress */}
      <div className="w-full max-w-md mb-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>{index + 1} of {total}</span>
          <span>{Math.round(((index + 1) / total) * 100)}%</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-foreground transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl border bg-card shadow-sm p-6 space-y-5">
        {/* Customer header */}
        <div className="flex items-center gap-4">
          <Avatar name={customer.name} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-lg leading-tight">{customer.name}</span>
              {customer.tier && (
                <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                  {customer.tier}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                Last seen {daysSince(customer.last_visit_at)}
              </span>
              <span>{customer.points.toLocaleString()} pts</span>
            </div>
          </div>
        </div>

        {/* AI reason */}
        {customer.churn_risk_reason && (
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-3 italic">
            "{customer.churn_risk_reason}"
          </div>
        )}

        {/* Action selector */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Action</p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { type: 'gift_points' as ActionType, label: 'Gift points', icon: Gift },
                { type: 'send_reward' as ActionType, label: 'Send reward', icon: Star },
                { type: 'dismiss' as ActionType, label: 'Dismiss', icon: CheckCheck },
              ] as const
            ).map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => setActionType(type)}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-medium transition-colors',
                  actionType === type
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-background hover:bg-muted',
                )}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Disabled reminder button shown below */}
          <div title="Notification channels coming soon" className="w-full">
            <button
              disabled
              className="flex items-center gap-2 w-full rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground cursor-not-allowed opacity-50"
            >
              <Bell size={14} />
              Send a reminder — coming soon
            </button>
          </div>
        </div>

        {/* Action inputs */}
        {actionType === 'gift_points' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Points to gift</label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 50"
                value={giftPoints}
                onChange={e => setGiftPoints(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
              <Input
                placeholder="e.g. Thanks for being a loyal customer"
                value={giftNote}
                onChange={e => setGiftNote(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {actionType === 'send_reward' && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Choose reward</label>
            {rewards.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-2">No active rewards — add rewards first.</p>
            ) : (
              <select
                value={rewardId}
                onChange={e => setRewardId(e.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {rewards.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.points_cost} pts)
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="w-full max-w-md flex items-center justify-between mt-5 gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrev}
          disabled={index === 0}
          className="gap-1.5"
        >
          <ArrowLeft size={16} />
          Back
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          className="gap-1.5 flex-1"
        >
          {actionType === 'dismiss' ? (
            <>Dismiss & continue</>
          ) : (
            <>Send & continue <ArrowRight size={16} /></>
          )}
        </Button>
      </div>
    </div>
  )
}

// ─── Summary screen ──────────────────────────────────────────────────────────

function SummaryScreen({ actedCount, onDone }: { actedCount: number; onDone: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <CheckCheck size={32} className="text-foreground" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">
          {actedCount > 0
            ? `You reached out to ${actedCount} ${actedCount === 1 ? 'customer' : 'customers'} today.`
            : 'All caught up.'}
        </h2>
        <p className="text-sm text-muted-foreground">
          Check back tomorrow to see how things are going.
        </p>
      </div>
      <Button onClick={onDone}>Done</Button>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

type Tab = 'flow' | 'history'

export default function CatchUp() {
  const { ownedBusinessId } = useAuth()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('flow')
  const [customers, setCustomers] = useState<AtRiskCustomer[]>([])
  const [rewards, setRewards] = useState<ActiveReward[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [actedCount, setActedCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Touch swipe tracking
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    if (!ownedBusinessId) return
    let cancelled = false

    async function load() {
      setLoading(true)

      // Fire-and-forget: trigger churn scoring so scores are fresh
      supabase.functions.invoke('score-churn-risk', {
        body: { business_id: ownedBusinessId },
      }).catch(() => {
        // Non-fatal: scores may be slightly stale
      })

      const [customersRes, rewardsRes] = await Promise.all([
        supabase
          .from('customers')
          .select('id, name, tier, points, last_visit_at, churn_risk_reason, churn_risk_score')
          .eq('business_id', ownedBusinessId)
          .gte('churn_risk_score', 0.5)
          .order('churn_risk_score', { ascending: false }),
        supabase
          .from('rewards')
          .select('id, name, points_cost')
          .eq('business_id', ownedBusinessId)
          .eq('status', 'active'),
      ])

      if (cancelled) return
      setCustomers((customersRes.data as AtRiskCustomer[]) ?? [])
      setRewards((rewardsRes.data as ActiveReward[]) ?? [])
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [ownedBusinessId])

  const handleAction = useCallback(async (
    type: ActionType,
    extras: { points?: number; note?: string; rewardId?: string },
  ) => {
    if (!ownedBusinessId || submitting) return
    const customer = customers[currentIndex]
    if (!customer) return

    setSubmitting(true)
    try {
      await supabase.from('catch_up_actions').insert({
        business_id: ownedBusinessId,
        customer_id: customer.id,
        action_type: type,
        points_gifted: extras.points ?? null,
        reward_id: extras.rewardId ?? null,
        note: extras.note ?? null,
      })

      if (type === 'gift_points' && extras.points) {
        // Insert transaction + update points balance
        await supabase.from('point_transactions').insert({
          business_id: ownedBusinessId,
          customer_id: customer.id,
          points: extras.points,
          reason: 'catch_up_gift',
        })
        await supabase
          .from('customers')
          .update({ points: customer.points + extras.points })
          .eq('id', customer.id)
      }

      if (type !== 'dismiss') {
        setActedCount(c => c + 1)
      }

      if (currentIndex + 1 >= customers.length) {
        setDone(true)
      } else {
        setCurrentIndex(i => i + 1)
      }
    } finally {
      setSubmitting(false)
    }
  }, [ownedBusinessId, submitting, customers, currentIndex])

  function handlePrev() {
    setCurrentIndex(i => Math.max(0, i - 1))
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (dx < -60) {
      // swipe left → dismiss
      handleAction('dismiss', {})
    } else if (dx > 60) {
      // swipe right → go back
      handlePrev()
    }
  }

  const currentCustomer = customers[currentIndex]

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center h-14 border-b px-4 gap-4 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => navigate('/owner/dashboard')}
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={18} />
        </Button>

        <div className="flex-1 flex items-center justify-center">
          <div className="flex rounded-lg border overflow-hidden">
            <button
              onClick={() => setTab('flow')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium transition-colors',
                tab === 'flow' ? 'bg-foreground text-background' : 'hover:bg-muted',
              )}
            >
              Catch up
            </button>
            <button
              onClick={() => setTab('history')}
              className={cn(
                'px-4 py-1.5 text-sm font-medium transition-colors',
                tab === 'history' ? 'bg-foreground text-background' : 'hover:bg-muted',
              )}
            >
              History
            </button>
          </div>
        </div>

        {/* Spacer to balance the back button */}
        <div className="w-8 shrink-0" />
      </header>

      {/* Body */}
      {tab === 'history' ? (
        ownedBusinessId ? (
          <HistoryTab businessId={ownedBusinessId} />
        ) : null
      ) : (
        <div
          className="flex-1 flex flex-col overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Loading…</span>
            </div>
          ) : done ? (
            <SummaryScreen actedCount={actedCount} onDone={() => navigate('/owner/dashboard')} />
          ) : customers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
              <CheckCheck size={40} className="text-muted-foreground" />
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">All customers are active</h2>
                <p className="text-sm text-muted-foreground">Check back tomorrow.</p>
              </div>
              <Button variant="outline" onClick={() => navigate('/owner/dashboard')}>
                Back to dashboard
              </Button>
            </div>
          ) : (
            <CustomerCard
              customer={currentCustomer}
              index={currentIndex}
              total={customers.length}
              rewards={rewards}
              onAction={handleAction}
              onPrev={handlePrev}
              submitting={submitting}
            />
          )}
        </div>
      )}
    </div>
  )
}
