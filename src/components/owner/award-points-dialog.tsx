import { useEffect, useRef, useState } from 'react'
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
import { cn } from '@/lib/utils'
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

function tierMultiplierFor(program: LoyaltyProgram, tierName: string | null): number {
  if (!tierName) return 1
  const tier = program.reward_tiers?.tiers?.find(
    t => t.name.toLowerCase() === tierName.toLowerCase(),
  )
  return tier?.multiplier ?? 1
}

function computePoints(purchaseAmount: number, program: LoyaltyProgram, tier: string | null): number {
  const ppd = program.earn_rules?.points_per_dollar ?? 0
  const multiplier = tierMultiplierFor(program, tier)
  return Math.floor(purchaseAmount * ppd * multiplier)
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '')
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

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setPhase('lookup')
      setPhone('')
      setCustomer(null)
      setProgram(null)
      setNotFound(false)
      setLookupError(null)
      setPurchaseAmount('')
      setSubmitError(null)
    } else {
      setTimeout(() => phoneInputRef.current?.focus(), 50)
    }
  }, [open])

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
      setSubmitError('Enter a valid purchase amount greater than 0.')
      return
    }

    const points = program ? computePoints(amount, program, customer.tier) : 0
    if (points < 1) {
      setSubmitError('Purchase amount is too small to earn any points.')
      return
    }

    setSubmitting(true)

    const { error: txErr } = await supabase.from('point_transactions').insert({
      customer_id: customer.id,
      business_id: businessId,
      points,
      reason: 'purchase',
    })

    if (txErr) { setSubmitError(txErr.message); setSubmitting(false); return }

    const { error: ptErr } = await supabase
      .from('customers')
      .update({ points: customer.points + points })
      .eq('id', customer.id)

    if (ptErr) { setSubmitError(ptErr.message); setSubmitting(false); return }

    setSubmitting(false)
    onOpenChange(false)
    onSuccess()
  }

  const points = customer && program && purchaseAmount
    ? computePoints(parseFloat(purchaseAmount) || 0, program, customer.tier)
    : null

  const tierCls = customer ? tierColor(customer.tier) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Award points manually</DialogTitle>
          <DialogDescription>
            Look up a customer by phone number and credit points for a purchase.
          </DialogDescription>
        </DialogHeader>

        {phase === 'lookup' && (
          <form onSubmit={handleLookup} className="px-6 py-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <Input
                ref={phoneInputRef}
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={e => { setPhone(e.target.value); setNotFound(false) }}
                className="flex-1"
                aria-label="Customer phone number"
              />
              <Button type="submit" disabled={searching || !phone.trim()}>
                {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              </Button>
            </div>

            {notFound && (
              <p className="text-sm text-muted-foreground">
                No customer found with that phone number.
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
                {customer.tier && tierCls && (
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
                    tierCls,
                  )}>
                    <Star size={10} />
                    {customer.tier.charAt(0).toUpperCase() + customer.tier.slice(1).toLowerCase()}
                  </span>
                )}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{customer.points.toLocaleString()} pts balance</span>
                {customer.phone && <span>{customer.phone}</span>}
              </div>
            </div>

            {/* Purchase amount entry */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="purchase-amount">
                Purchase amount ($)
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
                  This will credit <span className="font-semibold text-foreground">{points.toLocaleString()} points</span>
                  {customer.tier && ` (${customer.tier.toLowerCase()} tier multiplier applied)`}
                </p>
              )}
              {points !== null && points === 0 && purchaseAmount && parseFloat(purchaseAmount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Amount too small to earn points with the current earn rate.
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
              Look up a different customer
            </button>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          {phase === 'confirm' && (
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={submitting || !purchaseAmount || parseFloat(purchaseAmount) <= 0}
            >
              {submitting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              {submitting ? 'Saving…' : 'Award points'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
