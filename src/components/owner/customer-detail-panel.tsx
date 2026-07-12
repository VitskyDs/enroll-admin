import { useState, useEffect, useCallback } from 'react'
import { X, Check, Gift, CreditCard, Star, Users, TrendingUp, TrendingDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@vitskyds/enroll-ui'
import { Button } from '@vitskyds/enroll-ui'
import { cn } from '@/lib/utils'
import { Drawer } from '@/components/owner/drawer'
import type { OwnerCustomer } from '@/hooks/useOwnerCustomers'

// Retains the last non-null customer so its content stays visible while the
// drawer animates out after `customer` is cleared.
function useRetainedCustomer(customer: OwnerCustomer | null) {
  const [shown, setShown] = useState(customer)
  useEffect(() => { if (customer) setShown(customer) }, [customer])
  return shown
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Transaction = {
  id: string
  points: number
  reason: string
  created_at: string
}

type Referral = {
  id: string
  referee: { name: string; joined_at: string | null } | null
  created_at: string
  status: string
}

type PanelData = {
  transactions: Transaction[]
  referrals: Referral[]
  punchCardEnabled: boolean
  punchTarget: number | null
  punchRewardName: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeDate(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('')
}

function reasonLabel(reason: string) {
  const map: Record<string, string> = {
    purchase: 'Purchase',
    service_visit: 'Visit',
    check_in: 'Check-in',
    referral: 'Referral bonus',
    redemption: 'Redemption',
    manual_gift: 'Gift from owner',
    birthday_bonus: 'Birthday bonus',
    catch_up_gift: 'Catch up gift',
    punch_card: 'Punch card reward',
  }
  return map[reason] ?? reason.replace(/_/g, ' ')
}

function tierColor(tier: string | null) {
  switch (tier?.toLowerCase()) {
    case 'gold':   return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'silver': return 'text-zinc-500 bg-zinc-50 border-zinc-200'
    case 'bronze': return 'text-orange-600 bg-orange-50 border-orange-200'
    default:       return null
  }
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="flex items-center gap-2 rounded-lg bg-foreground text-background text-sm px-3 py-2">
      <Check size={13} />
      {message}
    </div>
  )
}

// ─── Panel content ────────────────────────────────────────────────────────────

function PanelContent({
  customer,
  businessId,
  onClose,
}: {
  customer: OwnerCustomer
  businessId: string
  onClose: () => void
}) {
  const [data, setData] = useState<PanelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [giftAmount, setGiftAmount] = useState('')
  const [giftNote, setGiftNote] = useState('')
  const [gifting, setGifting] = useState(false)
  const [giftError, setGiftError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [localPoints, setLocalPoints] = useState(customer.points)

  const load = useCallback(async () => {
    setLoading(true)
    const [txRes, refRes, progRes] = await Promise.all([
      supabase
        .from('point_transactions')
        .select('id, points, reason, created_at')
        .eq('customer_id', customer.id)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('referrals')
        .select('id, status, created_at, referee_id')
        .eq('referrer_id', customer.id)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false }),
      supabase
        .from('loyalty_programs')
        .select('punch_card_enabled, punch_card_target, punch_card_reward_id')
        .eq('business_id', businessId)
        .maybeSingle(),
    ])

    // Fetch referee names
    const refereeIds = (refRes.data ?? [])
      .map(r => r.referee_id)
      .filter(Boolean) as string[]

    let refereeMap: Record<string, { name: string; joined_at: string | null }> = {}
    if (refereeIds.length) {
      const { data: referees } = await supabase
        .from('customers')
        .select('id, name, joined_at')
        .in('id', refereeIds)
      refereeMap = Object.fromEntries((referees ?? []).map(r => [r.id, r]))
    }

    const referrals: Referral[] = (refRes.data ?? []).map(r => ({
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      referee: r.referee_id ? (refereeMap[r.referee_id] ?? null) : null,
    }))

    const rewardId = progRes.data?.punch_card_reward_id ?? null
    const punchRewardName = rewardId
      ? (await supabase.from('rewards').select('name').eq('id', rewardId).single()).data?.name ?? null
      : null

    setData({
      transactions: (txRes.data ?? []) as Transaction[],
      referrals,
      punchCardEnabled: progRes.data?.punch_card_enabled ?? false,
      punchTarget: progRes.data?.punch_card_target ?? null,
      punchRewardName,
    })
    setLoading(false)
  }, [customer.id, businessId])

  useEffect(() => { load() }, [load])
  useEffect(() => { setLocalPoints(customer.points) }, [customer.points])

  async function handleGift() {
    setGiftError(null)
    const amount = parseInt(giftAmount, 10)
    if (!amount || amount < 1) { setGiftError('Enter a positive number of points.'); return }
    setGifting(true)

    const { error: giftErr } = await supabase.rpc('gift_points', {
      p_customer_id: customer.id,
      p_amount: amount,
    })
    if (giftErr) { setGiftError(giftErr.message); setGifting(false); return }

    setLocalPoints(p => p + amount)
    setGiftAmount('')
    setGiftNote('')
    setGifting(false)
    setToast(`${amount} points gifted`)
    load()
  }

  const tierCls = tierColor(customer.tier)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
            {initials(customer.name)}
          </div>
          <div>
            <div className="font-semibold text-sm">{customer.name}</div>
            {customer.email && <div className="text-xs text-muted-foreground">{customer.email}</div>}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 -mt-0.5 -mr-1" onClick={onClose}>
          <X size={16} />
        </Button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Stats strip */}
        <div className="grid grid-cols-3 divide-x border-b">
          {[
            { label: 'Points', value: localPoints.toLocaleString() },
            { label: 'Lifetime', value: customer.lifetime_points.toLocaleString() },
            { label: 'Joined', value: formatDate(customer.joined_at) },
          ].map(({ label, value }) => (
            <div key={label} className="px-3 py-3 text-center">
              <div className="text-xs text-muted-foreground">{label}</div>
              <div className="text-sm font-semibold mt-0.5 tabular-nums">{value}</div>
            </div>
          ))}
        </div>

        {/* Tier badge */}
        {customer.tier && tierCls && (
          <div className="px-5 py-3 border-b flex items-center gap-2">
            <Star size={13} className="text-muted-foreground" />
            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', tierCls)}>
              {customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1).toLowerCase()}
            </span>
          </div>
        )}

        {loading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Punch card */}
            {data?.punchCardEnabled && data.punchTarget != null && data.punchTarget > 0 && (
              <div className="px-5 py-4 border-b">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium flex items-center gap-1.5">
                    <CreditCard size={13} className="text-muted-foreground" />
                    Punch card
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {customer.punch_card_count} / {data.punchTarget} punches
                  </span>
                </div>
                <div className="flex gap-1 flex-wrap mb-2">
                  {Array.from({ length: data.punchTarget }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-5 h-5 rounded-full border-2 transition-colors',
                        i < customer.punch_card_count
                          ? 'bg-foreground border-foreground'
                          : 'border-muted-foreground/30',
                      )}
                    />
                  ))}
                </div>
                {data.punchRewardName && (
                  <p className="text-xs text-muted-foreground">
                    Reward: {data.punchRewardName}
                  </p>
                )}
              </div>
            )}

            {/* Gift points */}
            <div className="px-5 py-4 border-b">
              <p className="text-xs font-medium flex items-center gap-1.5 mb-3">
                <Gift size={13} className="text-muted-foreground" />
                Gift points
              </p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="Amount"
                  value={giftAmount}
                  onChange={e => setGiftAmount(e.target.value)}
                  className="w-28"
                />
                <Input
                  placeholder="Note (optional)"
                  value={giftNote}
                  onChange={e => setGiftNote(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleGift} disabled={gifting}>
                  {gifting ? '…' : 'Gift'}
                </Button>
              </div>
              {giftError && <p className="text-xs text-destructive mt-1.5">{giftError}</p>}
              {toast && <div className="mt-2"><Toast message={toast} onDone={() => setToast(null)} /></div>}
            </div>

            {/* Transaction history */}
            <div className="px-5 py-4 border-b">
              <p className="text-xs font-medium flex items-center gap-1.5 mb-3">
                <TrendingUp size={13} className="text-muted-foreground" />
                Transaction history
              </p>
              {data?.transactions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No transactions yet</p>
              ) : (
                <div className="space-y-2.5">
                  {data?.transactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                          tx.points > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500',
                        )}>
                          {tx.points > 0
                            ? <TrendingUp size={11} />
                            : <TrendingDown size={11} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{reasonLabel(tx.reason)}</p>
                          <p className="text-[11px] text-muted-foreground">{relativeDate(tx.created_at)}</p>
                        </div>
                      </div>
                      <span className={cn(
                        'text-xs font-semibold tabular-nums shrink-0',
                        tx.points > 0 ? 'text-emerald-600' : 'text-red-500',
                      )}>
                        {tx.points > 0 ? '+' : ''}{tx.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Referrals */}
            <div className="px-5 py-4">
              <p className="text-xs font-medium flex items-center gap-1.5 mb-3">
                <Users size={13} className="text-muted-foreground" />
                Referrals ({data?.referrals.length ?? 0})
              </p>
              {data?.referrals.length === 0 ? (
                <p className="text-xs text-muted-foreground">No referrals yet</p>
              ) : (
                <div className="space-y-2">
                  {data?.referrals.map(r => (
                    <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium truncate">{r.referee?.name ?? 'Unknown'}</span>
                      <span className="text-muted-foreground shrink-0">
                        {r.referee?.joined_at ? formatDate(r.referee.joined_at) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Desktop right drawer ─────────────────────────────────────────────────────

export function CustomerDetailPanel({
  customer,
  businessId,
  onClose,
}: {
  customer: OwnerCustomer | null
  businessId: string | null
  onClose: () => void
}) {
  const shown = useRetainedCustomer(customer)
  return (
    <Drawer
      open={!!customer && !!businessId}
      onClose={onClose}
      side="right"
      rootClassName="hidden md:block"
      className="w-full max-w-md border-l flex flex-col overflow-hidden"
    >
      {shown && businessId && <PanelContent customer={shown} businessId={businessId} onClose={onClose} />}
    </Drawer>
  )
}

// ─── Mobile bottom drawer ─────────────────────────────────────────────────────

export function CustomerDetailDrawer({
  customer,
  businessId,
  onClose,
}: {
  customer: OwnerCustomer | null
  businessId: string | null
  onClose: () => void
}) {
  const shown = useRetainedCustomer(customer)
  return (
    <Drawer
      open={!!customer && !!businessId}
      onClose={onClose}
      side="bottom"
      rootClassName="md:hidden"
      className="rounded-t-xl border-t max-h-[85vh] flex flex-col"
    >
      <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mt-3 mb-1 shrink-0" />
      <div className="flex-1 overflow-hidden">
        {shown && businessId && <PanelContent customer={shown} businessId={businessId} onClose={onClose} />}
      </div>
    </Drawer>
  )
}
