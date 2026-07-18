import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { X, Check, Gift, CreditCard, Star, Users, TrendingUp, TrendingDown, Phone, Pencil, Repeat } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@vitskyds/enroll-ui'
import { Button } from '@vitskyds/enroll-ui'
import { cn, normalizePhone } from '@/lib/utils'
import { Drawer } from '@/components/owner/drawer'
import type { OwnerCustomer } from '@/hooks/useOwnerCustomers'
import type { ServiceSubscription } from '@/types'

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

type Subscription = Pick<ServiceSubscription, 'id' | 'interval' | 'status' | 'next_renewal_at' | 'cancelled_at'> & {
  service_name: string
}

type PanelData = {
  transactions: Transaction[]
  referrals: Referral[]
  subscriptions: Subscription[]
  punchCardEnabled: boolean
  punchTarget: number | null
  punchRewardName: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeDate(t: TFunction, iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / 86_400_000)
  if (days === 0) return t('admin.customerDetail.today')
  if (days === 1) return t('admin.customerDetail.yesterday')
  if (days < 7) return t('admin.customerDetail.daysAgo', { count: days })
  if (days < 30) return t('admin.customerDetail.weeksAgo', { count: Math.floor(days / 7) })
  if (days < 365) return t('admin.customerDetail.monthsAgo', { count: Math.floor(days / 30) })
  return t('admin.customerDetail.yearsAgo', { count: Math.floor(days / 365) })
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('he-IL', { month: 'short', day: 'numeric', year: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('')
}

export function reasonLabel(t: TFunction, reason: string) {
  // settle_order inserts 'order:<order_id>' (earn) / 'order:<order_id>:redeem' (pay-with-points) — see doc-8.
  if (reason.startsWith('order:')) return reason.endsWith(':redeem') ? t('history.reason.redemption') : t('history.purchase')

  const map: Record<string, string> = {
    purchase: t('history.purchase'),
    service_visit: t('history.reason.service_visit'),
    check_in: t('history.reason.check_in'),
    referral: t('history.reason.referral'),
    redemption: t('history.reason.redemption'),
    manual_gift: t('admin.customerDetail.reasonManualGift'),
    birthday_bonus: t('history.reason.birthday_bonus'),
    catch_up_gift: t('admin.customerDetail.reasonCatchUpGift'),
    punch_card: t('admin.customerDetail.reasonPunchCard'),
    service_subscription_start: t('history.reason.service_subscription_start'),
    service_subscription_renewal: t('history.reason.service_subscription_renewal'),
    service_purchase: t('history.reason.service_purchase'),
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

function tierLabel(t: TFunction, tier: string) {
  switch (tier.toLowerCase()) {
    case 'gold': return t('admin.customers.tierGold')
    case 'silver': return t('admin.customers.tierSilver')
    case 'bronze': return t('admin.customers.tierBronze')
    default: return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()
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
  const { t } = useTranslation()
  const [data, setData] = useState<PanelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [giftAmount, setGiftAmount] = useState('')
  const [giftNote, setGiftNote] = useState('')
  const [gifting, setGifting] = useState(false)
  const [giftError, setGiftError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [localPoints, setLocalPoints] = useState(customer.points)
  const [phone, setPhone] = useState(customer.phone)
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneDraft, setPhoneDraft] = useState('')
  const [phoneSaving, setPhoneSaving] = useState(false)
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [txRes, refRes, progRes, subRes] = await Promise.all([
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
        .select('punch_card_enabled, punch_card_target, punch_card_reward_type, punch_card_reward_product_ids, punch_card_reward_category')
        .eq('business_id', businessId)
        .maybeSingle(),
      supabase
        .from('service_subscriptions')
        .select('id, interval, status, next_renewal_at, cancelled_at, services(name)')
        .eq('customer_id', customer.id)
        .eq('business_id', businessId)
        .order('started_at', { ascending: false }),
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

    const rewardType = progRes.data?.punch_card_reward_type ?? null
    let punchRewardName: string | null = null
    if (rewardType === 'products' && progRes.data?.punch_card_reward_product_ids?.length) {
      const { data: rewardProducts } = await supabase
        .from('products')
        .select('name')
        .in('id', progRes.data.punch_card_reward_product_ids)
      punchRewardName = (rewardProducts ?? []).map(p => p.name).join(', ') || null
    } else if (rewardType === 'category') {
      punchRewardName = progRes.data?.punch_card_reward_category ?? null
    }

    type SubscriptionRow = Omit<Subscription, 'service_name'> & {
      services: { name: string } | { name: string }[] | null
    }
    const subscriptions: Subscription[] = ((subRes.data ?? []) as SubscriptionRow[]).map(s => ({
      id: s.id,
      interval: s.interval,
      status: s.status,
      next_renewal_at: s.next_renewal_at,
      cancelled_at: s.cancelled_at,
      service_name: (Array.isArray(s.services) ? s.services[0]?.name : s.services?.name) ?? t('admin.customerDetail.unknownReferee'),
    }))

    setData({
      transactions: (txRes.data ?? []) as Transaction[],
      referrals,
      subscriptions,
      punchCardEnabled: progRes.data?.punch_card_enabled ?? false,
      punchTarget: progRes.data?.punch_card_target ?? null,
      punchRewardName,
    })
    setLoading(false)
  }, [customer.id, businessId, t])

  useEffect(() => { load() }, [load])
  useEffect(() => { setLocalPoints(customer.points) }, [customer.points])
  useEffect(() => { setPhone(customer.phone) }, [customer.phone])

  function startEditPhone() {
    setPhoneDraft(phone ?? '')
    setPhoneError(null)
    setEditingPhone(true)
  }

  async function handleSavePhone(e: React.FormEvent) {
    e.preventDefault()
    const normalized = normalizePhone(phoneDraft)
    if (phoneDraft.trim() && normalized.length < 7) {
      setPhoneError(t('admin.customerDetail.phoneInvalid'))
      return
    }
    setPhoneSaving(true)
    setPhoneError(null)

    const { error: phoneErr } = await supabase.rpc('update_customer_phone', {
      p_customer_id: customer.id,
      p_phone: normalized || null,
    })

    if (phoneErr) { setPhoneError(phoneErr.message); setPhoneSaving(false); return }

    setPhone(normalized || null)
    setPhoneSaving(false)
    setEditingPhone(false)
    setToast(t('admin.customerDetail.phoneUpdated'))
  }

  async function handleGift() {
    setGiftError(null)
    const amount = parseInt(giftAmount, 10)
    if (!amount || amount < 1) { setGiftError(t('admin.customerDetail.giftInvalid')); return }
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
    setToast(t('admin.customerDetail.pointsGifted', { count: amount }))
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
            { label: t('admin.customers.colPoints'), value: localPoints.toLocaleString() },
            { label: t('rewards.lifetime'), value: customer.lifetime_points.toLocaleString() },
            { label: t('admin.customers.colJoined'), value: formatDate(customer.joined_at) },
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
              {tierLabel(t, customer.tier)}
            </span>
          </div>
        )}

        {/* Phone */}
        <div className="px-5 py-3 border-b flex items-center gap-2">
          <Phone size={13} className="text-muted-foreground shrink-0" />
          {editingPhone ? (
            <form onSubmit={handleSavePhone} className="flex items-center gap-2 flex-1 min-w-0">
              <Input
                autoFocus
                type="tel"
                value={phoneDraft}
                onChange={e => { setPhoneDraft(e.target.value); setPhoneError(null) }}
                placeholder={t('admin.customerDetail.phonePlaceholder')}
                aria-label={t('admin.customerDetail.phonePlaceholder')}
                className="h-7 text-xs flex-1"
              />
              <Button type="submit" size="sm" className="h-7 px-2 text-xs shrink-0" disabled={phoneSaving}>
                {phoneSaving ? t('common.saving') : t('common.save')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs shrink-0"
                onClick={() => { setEditingPhone(false); setPhoneError(null) }}
              >
                {t('common.cancel')}
              </Button>
            </form>
          ) : (
            <>
              <span className="text-xs flex-1 truncate">
                {phone || t('admin.customerDetail.phoneNotSet')}
              </span>
              <button
                type="button"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={startEditPhone}
                aria-label={t('admin.customerDetail.phoneEditAriaLabel')}
              >
                <Pencil size={12} />
              </button>
            </>
          )}
        </div>
        {phoneError && (
          <p className="px-5 py-2 -mt-1 text-xs text-destructive border-b">{phoneError}</p>
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
                    {t('home.punchCard')}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t('admin.customerDetail.punchesCount', { count: customer.punch_card_count, target: data.punchTarget })}
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
                    {t('admin.customerDetail.punchReward', { name: data.punchRewardName })}
                  </p>
                )}
              </div>
            )}

            {/* Gift points */}
            <div className="px-5 py-4 border-b">
              <p className="text-xs font-medium flex items-center gap-1.5 mb-3">
                <Gift size={13} className="text-muted-foreground" />
                {t('admin.customerDetail.giftPoints')}
              </p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  placeholder={t('admin.customerDetail.amountPlaceholder')}
                  value={giftAmount}
                  onChange={e => setGiftAmount(e.target.value)}
                  className="w-28"
                />
                <Input
                  placeholder={t('admin.customerDetail.notePlaceholder')}
                  value={giftNote}
                  onChange={e => setGiftNote(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleGift} disabled={gifting}>
                  {gifting ? '…' : t('admin.customerDetail.giftButton')}
                </Button>
              </div>
              {giftError && <p className="text-xs text-destructive mt-1.5">{giftError}</p>}
              {toast && <div className="mt-2"><Toast message={toast} onDone={() => setToast(null)} /></div>}
            </div>

            {/* Transaction history */}
            <div className="px-5 py-4 border-b">
              <p className="text-xs font-medium flex items-center gap-1.5 mb-3">
                <TrendingUp size={13} className="text-muted-foreground" />
                {t('history.title')}
              </p>
              {data?.transactions.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('history.empty')}</p>
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
                          <p className="text-xs font-medium truncate">{reasonLabel(t, tx.reason)}</p>
                          <p className="text-[11px] text-muted-foreground">{relativeDate(t, tx.created_at)}</p>
                        </div>
                      </div>
                      <span dir="ltr" className={cn(
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
            <div className="px-5 py-4 border-b">
              <p className="text-xs font-medium flex items-center gap-1.5 mb-3">
                <Users size={13} className="text-muted-foreground" />
                {t('admin.customerDetail.referralsCount', { count: data?.referrals.length ?? 0 })}
              </p>
              {data?.referrals.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('referrals.empty')}</p>
              ) : (
                <div className="space-y-2">
                  {data?.referrals.map(r => (
                    <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium truncate">{r.referee?.name ?? t('admin.customerDetail.unknownReferee')}</span>
                      <span className="text-muted-foreground shrink-0">
                        {r.referee?.joined_at ? formatDate(r.referee.joined_at) : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Service subscriptions */}
            <div className="px-5 py-4">
              <p className="text-xs font-medium flex items-center gap-1.5 mb-3">
                <Repeat size={13} className="text-muted-foreground" />
                {t('admin.customerDetail.subscriptionsCount', { count: data?.subscriptions.length ?? 0 })}
              </p>
              {data?.subscriptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('admin.customerDetail.subscriptionsEmpty')}</p>
              ) : (
                <div className="space-y-2.5">
                  {data?.subscriptions.map(s => (
                    <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.service_name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {s.interval === 'weekly'
                            ? t('admin.services.subscriptionIntervalWeekly')
                            : t('admin.services.subscriptionIntervalMonthly')}
                          {' · '}
                          {s.status === 'cancelled'
                            ? t('admin.customerDetail.subscriptionCancelledOn', { date: formatDate(s.cancelled_at) })
                            : t('admin.customerDetail.subscriptionNextRenewal', { date: formatDate(s.next_renewal_at) })}
                        </p>
                      </div>
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0',
                        s.status === 'active'
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-zinc-500 bg-zinc-50 border-zinc-200',
                      )}>
                        {s.status === 'active'
                          ? t('admin.customerDetail.subscriptionStatusActive')
                          : t('admin.customerDetail.subscriptionStatusCancelled')}
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
