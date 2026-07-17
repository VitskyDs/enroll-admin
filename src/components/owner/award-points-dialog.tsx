import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Search, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@vitskyds/enroll-ui'
import { Input } from '@vitskyds/enroll-ui'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { cn, normalizePhone } from '@/lib/utils'
import type { Customer, LoyaltyProgram } from '@/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tierColor(tier: string | null) {
  switch (tier?.toLowerCase()) {
    case 'gold':   return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'silver': return 'text-zinc-500 bg-zinc-50 border-zinc-200'
    case 'bronze': return 'text-orange-600 bg-orange-50 border-orange-200'
    default:       return null
  }
}

// Mirrors award_manual_points' server-side tier lookup: the highest tier
// whose min_points threshold the customer's lifetime_points has cleared.
// customers.tier is a freestanding column nothing in the app writes — real
// tier is always derived from lifetime_points, same as Home.tsx and settle_order.
function currentTierFor(program: LoyaltyProgram, lifetimePoints: number) {
  const sorted = [...(program.reward_tiers?.tiers ?? [])].sort((a, b) => a.min_points - b.min_points)
  return [...sorted].reverse().find(t => t.min_points <= lifetimePoints) ?? sorted[0] ?? null
}

function computePoints(purchaseAmount: number, program: LoyaltyProgram, lifetimePoints: number): number {
  const ppd = program.earn_rules?.points_per_dollar ?? 0
  const multiplier = currentTierFor(program, lifetimePoints)?.multiplier ?? 1
  return Math.floor(purchaseAmount * ppd * multiplier)
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'lookup' | 'confirm'

// ─── Component ───────────────────────────────────────────────────────────────

export function AwardPointsDialog({
  open,
  onOpenChange,
  businessId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  businessId: string
  onSuccess: () => void
}) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>('lookup')
  const [phone, setPhone] = useState('')
  const [searching, setSearching] = useState(false)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [program, setProgram] = useState<LoyaltyProgram | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  const [purchaseAmount, setPurchaseAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const phoneInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => phoneInputRef.current?.focus(), 50)
  }, [open])

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPhase('lookup')
      setPhone('')
      setCustomer(null)
      setProgram(null)
      setNotFound(false)
      setLookupError(null)
      setPurchaseAmount('')
      setSubmitError(null)
    }
    onOpenChange(next)
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    const normalized = normalizePhone(phone)
    if (!normalized) return

    setSearching(true)
    setNotFound(false)
    setLookupError(null)
    setCustomer(null)

    const [customerRes, programRes] = await Promise.all([
      supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .eq('phone', normalized)
        .maybeSingle(),
      supabase
        .from('loyalty_programs')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle(),
    ])

    setSearching(false)

    if (customerRes.error) { setLookupError(customerRes.error.message); return }
    if (programRes.error) { setLookupError(programRes.error.message); return }

    if (!customerRes.data) { setNotFound(true); return }

    setCustomer(customerRes.data as Customer)
    setProgram(programRes.data as LoyaltyProgram | null)
    setPhase('confirm')
  }

  async function handleConfirm() {
    if (!customer) return
    setSubmitError(null)

    const amount = parseFloat(purchaseAmount)
    if (!purchaseAmount || isNaN(amount) || amount <= 0) {
      setSubmitError(t('admin.awardPoints.invalidAmount'))
      return
    }

    setSubmitting(true)

    const { error: rpcErr } = await supabase.rpc('award_manual_points', {
      p_customer_id: customer.id,
      p_purchase_amount: amount,
    })

    if (rpcErr) { setSubmitError(rpcErr.message); setSubmitting(false); return }

    setSubmitting(false)
    handleOpenChange(false)
    onSuccess()
  }

  const currentTier = customer && program ? currentTierFor(program, customer.lifetime_points) : null

  const points = customer && program && purchaseAmount
    ? computePoints(parseFloat(purchaseAmount) || 0, program, customer.lifetime_points)
    : null

  const tierCls = currentTier ? tierColor(currentTier.name) : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('admin.awardPoints.title')}</DialogTitle>
          <DialogDescription>
            {t('admin.awardPoints.description')}
          </DialogDescription>
        </DialogHeader>

        {phase === 'lookup' && (
          <form onSubmit={handleLookup} className="px-6 py-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <Input
                ref={phoneInputRef}
                type="tel"
                placeholder={t('admin.awardPoints.phonePlaceholder')}
                value={phone}
                onChange={e => { setPhone(e.target.value); setNotFound(false) }}
                className="flex-1"
                aria-label={t('admin.awardPoints.phoneAriaLabel')}
              />
              <Button type="submit" disabled={searching || !phone.trim()}>
                {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              </Button>
            </div>

            {notFound && (
              <p className="text-sm text-muted-foreground">
                {t('admin.awardPoints.notFound')}
              </p>
            )}
            {lookupError && (
              <p className="text-sm text-destructive">{lookupError}</p>
            )}
          </form>
        )}

        {phase === 'confirm' && customer && (
          <div className="px-6 py-4 flex flex-col gap-4">
            {/* Customer profile strip */}
            <div className="rounded-lg border bg-muted/30 px-4 py-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm">{customer.name}</span>
                {currentTier && tierCls && (
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                    tierCls,
                  )}>
                    <Star size={10} />
                    {currentTier.name}
                  </span>
                )}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{t('admin.awardPoints.ptsBalance', { count: customer.points })}</span>
                {customer.phone && <span>{customer.phone}</span>}
              </div>
            </div>

            {/* Purchase amount entry */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="purchase-amount">
                {t('admin.awardPoints.purchaseAmountLabel')}
              </label>
              <Input
                id="purchase-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={purchaseAmount}
                onChange={e => { setPurchaseAmount(e.target.value); setSubmitError(null) }}
                autoFocus
              />
              {points !== null && points > 0 && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{t('admin.awardPoints.willCredit', { count: points })}</span>
                  {currentTier && currentTier.multiplier && currentTier.multiplier !== 1 && ` ${t('admin.awardPoints.multiplierApplied', { tier: currentTier.name })}`}
                </p>
              )}
              {points !== null && points === 0 && purchaseAmount && parseFloat(purchaseAmount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('admin.awardPoints.tooSmall')}
                </p>
              )}
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}

            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-2 self-start"
              onClick={() => { setPhase('lookup'); setCustomer(null); setPurchaseAmount(''); setSubmitError(null) }}
            >
              {t('admin.awardPoints.lookupDifferent')}
            </button>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">{t('common.cancel')}</Button>
          </DialogClose>
          {phase === 'confirm' && (
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={submitting || !purchaseAmount || parseFloat(purchaseAmount) <= 0}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              {submitting ? t('common.saving') : t('admin.awardPoints.submit')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
