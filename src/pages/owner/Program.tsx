import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2, ChevronUp, ChevronDown, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useLoyaltyProgram } from '@/hooks/useLoyaltyProgram'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { EarnRules, RewardTiersConfig, ReferralRules } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

type TierDraft = {
  name: string
  min_points: string
  perks: string[]
  newPerk: string
}

type ProductRow = {
  id: string
  name: string
  price_cents: number
  points_override: string
}

type ActiveReward = {
  id: string
  name: string
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-foreground text-background text-sm px-4 py-2.5 shadow-lg">
      <Check size={14} />
      {message}
    </div>
  )
}

function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  const toast = useCallback((m: string) => setMsg(m), [])
  const clear = useCallback(() => setMsg(null), [])
  return { msg, toast, clear }
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
  onSave,
  saving,
  error,
}: {
  title: string
  description?: string
  children: React.ReactNode
  onSave: () => void
  saving: boolean
  error: string | null
}) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="px-5 py-4 border-b">
        <h2 className="font-semibold text-sm">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
      <div className="px-5 py-3 border-t flex items-center justify-between bg-muted/20">
        {error ? <p className="text-xs text-destructive">{error}</p> : <span />}
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </section>
  )
}

function Field({
  label,
  hint,
  children,
  error,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  error?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
        checked ? 'bg-foreground' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm ring-0 transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OwnerProgram() {
  const { ownedBusinessId } = useAuth()
  const { program, loading } = useLoyaltyProgram(ownedBusinessId)
  const { msg: toastMsg, toast, clear: clearToast } = useToast()

  // ── Earn rules state ────────────────────────────────────────────────────────
  const [ppdollar, setPpdollar] = useState('')
  const [ppvisit, setPpvisit] = useState('')
  const [earnError, setEarnError] = useState<string | null>(null)
  const [earnSaving, setEarnSaving] = useState(false)

  // ── Birthday bonus state ────────────────────────────────────────────────────
  const [birthdayEnabled, setBirthdayEnabled] = useState(false)
  const [birthdayPoints, setBirthdayPoints] = useState('')
  const [birthdaySaving, setBirthdaySaving] = useState(false)
  const [birthdayError, setBirthdayError] = useState<string | null>(null)

  // ── Tiers state ─────────────────────────────────────────────────────────────
  const [tiers, setTiers] = useState<TierDraft[]>([])
  const [tiersError, setTiersError] = useState<string | null>(null)
  const [tiersSaving, setTiersSaving] = useState(false)

  // ── Referral rules state ────────────────────────────────────────────────────
  const [referrerPts, setReferrerPts] = useState('')
  const [refereePts, setRefereePts] = useState('')
  const [referralError, setReferralError] = useState<string | null>(null)
  const [referralSaving, setReferralSaving] = useState(false)

  // ── Punch card state ────────────────────────────────────────────────────────
  const [punchEnabled, setPunchEnabled] = useState(false)
  const [punchTarget, setPunchTarget] = useState('')
  const [punchRewardId, setPunchRewardId] = useState('')
  const [rewards, setRewards] = useState<ActiveReward[]>([])
  const [punchError, setPunchError] = useState<string | null>(null)
  const [punchSaving, setPunchSaving] = useState(false)

  // ── Per-product overrides state ─────────────────────────────────────────────
  const [products, setProducts] = useState<ProductRow[]>([])
  const [overridesSaving, setOverridesSaving] = useState(false)
  const [overridesError, setOverridesError] = useState<string | null>(null)

  // Initialise state from loaded program
  useEffect(() => {
    if (!program) return
    const earn = program.earn_rules as EarnRules
    setPpdollar(earn?.points_per_dollar != null ? String(earn.points_per_dollar) : '')
    setPpvisit(earn?.points_per_visit != null ? String(earn.points_per_visit) : '')
    setBirthdayEnabled(!!earn?.birthday_bonus_points)
    setBirthdayPoints(earn?.birthday_bonus_points != null ? String(earn.birthday_bonus_points) : '')

    const tconf = program.reward_tiers as RewardTiersConfig
    setTiers(
      (tconf?.tiers ?? []).map(t => ({
        name: t.name,
        min_points: String(t.min_points),
        perks: t.perks ?? (t.perk ? [t.perk] : []),
        newPerk: '',
      })),
    )

    const rconf = program.referral_rules as ReferralRules
    setReferrerPts(rconf?.referrer_points != null ? String(rconf.referrer_points) : '')
    setRefereePts(rconf?.referee_points != null ? String(rconf.referee_points) : '')

    setPunchEnabled(program.punch_card_enabled ?? false)
    setPunchTarget(program.punch_card_target != null ? String(program.punch_card_target) : '')
    setPunchRewardId(program.punch_card_reward_id ?? '')
  }, [program])

  // Load rewards + products
  useEffect(() => {
    if (!ownedBusinessId) return
    supabase
      .from('rewards')
      .select('id, name')
      .eq('business_id', ownedBusinessId)
      .eq('status', 'active')
      .then(({ data }) => setRewards(data ?? []))

    supabase
      .from('products')
      .select('id, name, price_cents, points_override')
      .eq('business_id', ownedBusinessId)
      .neq('status', 'inactive')
      .order('sort_order')
      .then(({ data }) =>
        setProducts(
          (data ?? []).map(p => ({
            id: p.id,
            name: p.name,
            price_cents: p.price_cents,
            points_override: p.points_override != null ? String(p.points_override) : '',
          })),
        ),
      )
  }, [ownedBusinessId])

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function currentEarnRules(): EarnRules {
    const base: EarnRules = {}
    if (ppdollar !== '') base.points_per_dollar = Number(ppdollar)
    if (ppvisit !== '') base.points_per_visit = Number(ppvisit)
    const existing = program?.earn_rules as EarnRules
    if (existing?.cents_per_point != null) base.cents_per_point = existing.cents_per_point
    if (birthdayEnabled && birthdayPoints !== '') base.birthday_bonus_points = Number(birthdayPoints)
    return base
  }

  // ── Save earn rules ─────────────────────────────────────────────────────────
  async function saveEarnRules() {
    setEarnError(null)
    if (ppdollar === '' && ppvisit === '') {
      setEarnError('At least one earn rule (per dollar or per visit) must be set.')
      return
    }
    if ((ppdollar !== '' && Number(ppdollar) < 0) || (ppvisit !== '' && Number(ppvisit) < 0)) {
      setEarnError('Values must be 0 or greater.')
      return
    }
    setEarnSaving(true)
    const { error } = await supabase
      .from('loyalty_programs')
      .update({ earn_rules: currentEarnRules() as object })
      .eq('business_id', ownedBusinessId!)
    setEarnSaving(false)
    if (error) { setEarnError(error.message); return }
    toast('Earn rules saved')
  }

  // ── Save birthday bonus ─────────────────────────────────────────────────────
  async function saveBirthdayBonus() {
    setBirthdayError(null)
    if (birthdayEnabled && (birthdayPoints === '' || Number(birthdayPoints) <= 0)) {
      setBirthdayError('Enter a bonus point value greater than 0.')
      return
    }
    setBirthdaySaving(true)
    const updatedEarn: EarnRules = { ...currentEarnRules() }
    if (birthdayEnabled && birthdayPoints !== '') {
      updatedEarn.birthday_bonus_points = Number(birthdayPoints)
    } else {
      delete updatedEarn.birthday_bonus_points
    }
    const { error } = await supabase
      .from('loyalty_programs')
      .update({ earn_rules: updatedEarn as object })
      .eq('business_id', ownedBusinessId!)
    setBirthdaySaving(false)
    if (error) { setBirthdayError(error.message); return }
    toast('Birthday bonus saved')
  }

  // ── Tiers operations ─────────────────────────────────────────────────────────
  function moveTier(i: number, dir: -1 | 1) {
    setTiers(prev => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  function updateTierField(i: number, field: 'name' | 'min_points' | 'newPerk', value: string) {
    setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t))
  }

  function addPerk(i: number) {
    const perk = tiers[i].newPerk.trim()
    if (!perk) return
    setTiers(prev => prev.map((t, idx) =>
      idx === i ? { ...t, perks: [...t.perks, perk], newPerk: '' } : t,
    ))
  }

  function removePerk(ti: number, pi: number) {
    setTiers(prev => prev.map((t, idx) =>
      idx === ti ? { ...t, perks: t.perks.filter((_, j) => j !== pi) } : t,
    ))
  }

  async function saveTiers() {
    setTiersError(null)
    for (const t of tiers) {
      if (!t.name.trim()) { setTiersError('All tiers must have a name.'); return }
      if (t.min_points === '' || Number(t.min_points) < 0) {
        setTiersError('All tiers must have a valid lifetime points threshold (≥ 0).')
        return
      }
    }
    const existing = (program?.reward_tiers as RewardTiersConfig)?.tiers ?? []
    const tierConfig: RewardTiersConfig = {
      tiers: tiers.map((t, i) => ({
        name: t.name.trim(),
        min_points: Number(t.min_points),
        multiplier: existing[i]?.multiplier ?? 1,
        perks: t.perks,
        perk: t.perks[0] ?? '',
      })),
    }
    setTiersSaving(true)
    const { error } = await supabase
      .from('loyalty_programs')
      .update({ reward_tiers: tierConfig as object })
      .eq('business_id', ownedBusinessId!)
    setTiersSaving(false)
    if (error) { setTiersError(error.message); return }
    toast('Tiers saved')
  }

  // ── Save referral rules ─────────────────────────────────────────────────────
  async function saveReferral() {
    setReferralError(null)
    if (referrerPts === '' || refereePts === '') {
      setReferralError('Both referrer and referee point values are required.')
      return
    }
    if (Number(referrerPts) < 0 || Number(refereePts) < 0) {
      setReferralError('Values must be 0 or greater.')
      return
    }
    setReferralSaving(true)
    const { error } = await supabase
      .from('loyalty_programs')
      .update({ referral_rules: { referrer_points: Number(referrerPts), referee_points: Number(refereePts) } })
      .eq('business_id', ownedBusinessId!)
    setReferralSaving(false)
    if (error) { setReferralError(error.message); return }
    toast('Referral rules saved')
  }

  // ── Save punch card ─────────────────────────────────────────────────────────
  async function savePunchCard() {
    setPunchError(null)
    if (punchEnabled) {
      const target = Number(punchTarget)
      if (punchTarget === '' || target < 1 || target > 20) {
        setPunchError('Target punches must be between 1 and 20.')
        return
      }
    }
    setPunchSaving(true)
    const { error } = await supabase
      .from('loyalty_programs')
      .update({
        punch_card_enabled: punchEnabled,
        punch_card_target: punchTarget !== '' ? Number(punchTarget) : 8,
        punch_card_reward_id: punchRewardId || null,
      })
      .eq('business_id', ownedBusinessId!)
    setPunchSaving(false)
    if (error) { setPunchError(error.message); return }
    toast('Punch card saved')
  }

  // ── Save per-product overrides ──────────────────────────────────────────────
  async function saveOverrides() {
    setOverridesError(null)
    for (const p of products) {
      if (p.points_override !== '' && Number(p.points_override) < 0) {
        setOverridesError('Points override values must be 0 or greater.')
        return
      }
    }
    setOverridesSaving(true)
    const updates = products.map(p =>
      supabase
        .from('products')
        .update({ points_override: p.points_override !== '' ? Number(p.points_override) : null })
        .eq('id', p.id),
    )
    const results = await Promise.all(updates)
    const err = results.find(r => r.error)?.error
    setOverridesSaving(false)
    if (err) { setOverridesError(err.message); return }
    toast('Product overrides saved')
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-2xl">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border h-32 animate-pulse bg-muted/30" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <h1 className="text-xl font-semibold">Program settings</h1>

      {/* Earn rules */}
      <Section
        title="Earn rules"
        description="How customers earn points. At least one rule must be set."
        onSave={saveEarnRules}
        saving={earnSaving}
        error={earnError}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Points per dollar" hint="Leave blank to disable">
            <Input
              type="number"
              min="0"
              placeholder="e.g. 1"
              value={ppdollar}
              onChange={e => setPpdollar(e.target.value)}
            />
          </Field>
          <Field label="Points per visit" hint="Leave blank to disable">
            <Input
              type="number"
              min="0"
              placeholder="e.g. 10"
              value={ppvisit}
              onChange={e => setPpvisit(e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* Birthday bonus */}
      <Section
        title="Birthday bonus"
        onSave={saveBirthdayBonus}
        saving={birthdaySaving}
        error={birthdayError}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable birthday bonus</p>
            <p className="text-xs text-muted-foreground">Award bonus points to customers on their birthday</p>
          </div>
          <Toggle checked={birthdayEnabled} onChange={setBirthdayEnabled} label="Enable birthday bonus" />
        </div>
        {birthdayEnabled && (
          <Field label="Bonus points">
            <Input
              type="number"
              min="1"
              placeholder="e.g. 50"
              value={birthdayPoints}
              onChange={e => setBirthdayPoints(e.target.value)}
              className="max-w-[140px]"
            />
          </Field>
        )}
      </Section>

      {/* Tiers */}
      <Section
        title="Tiers"
        description="Customers progress through tiers based on lifetime points."
        onSave={saveTiers}
        saving={tiersSaving}
        error={tiersError}
      >
        <div className="space-y-4">
          {tiers.map((tier, i) => (
            <div key={i} className="rounded-md border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground w-12 shrink-0">Tier {i + 1}</span>
                <Input
                  value={tier.name}
                  onChange={e => updateTierField(i, 'name', e.target.value)}
                  placeholder="Tier name"
                  className="flex-1"
                />
                <div className="flex flex-col">
                  <button
                    onClick={() => moveTier(i, -1)}
                    disabled={i === 0}
                    className="disabled:opacity-30 hover:text-foreground text-muted-foreground transition-colors"
                    aria-label="Move tier up"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveTier(i, 1)}
                    disabled={i === tiers.length - 1}
                    className="disabled:opacity-30 hover:text-foreground text-muted-foreground transition-colors"
                    aria-label="Move tier down"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground shrink-0 w-12">Min pts</label>
                <Input
                  type="number"
                  min="0"
                  value={tier.min_points}
                  onChange={e => updateTierField(i, 'min_points', e.target.value)}
                  className="max-w-[100px]"
                />
                <span className="text-xs text-muted-foreground">lifetime points</span>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Perks</p>
                <div className="space-y-1">
                  {tier.perks.map((perk, pi) => (
                    <div key={pi} className="flex items-center gap-2 group">
                      <span className="text-sm flex-1">{perk}</span>
                      <button
                        onClick={() => removePerk(i, pi)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                        aria-label="Remove perk"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a perk…"
                    value={tier.newPerk}
                    onChange={e => updateTierField(i, 'newPerk', e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addPerk(i)}
                    className="text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={() => addPerk(i)}>
                    <Plus size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {tiers.length === 0 && (
            <p className="text-sm text-muted-foreground">No tiers configured.</p>
          )}
        </div>
      </Section>

      {/* Referral rules */}
      <Section
        title="Referral rules"
        description="Points awarded when a customer refers someone new."
        onSave={saveReferral}
        saving={referralSaving}
        error={referralError}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Referrer points" hint="Awarded to the person who referred">
            <Input
              type="number"
              min="0"
              placeholder="e.g. 50"
              value={referrerPts}
              onChange={e => setReferrerPts(e.target.value)}
            />
          </Field>
          <Field label="Referee points" hint="Awarded to the new member">
            <Input
              type="number"
              min="0"
              placeholder="e.g. 50"
              value={refereePts}
              onChange={e => setRefereePts(e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* Punch card */}
      <Section
        title="Punch card"
        description="Customers earn a punch per qualifying visit. When they hit the target, a reward unlocks automatically."
        onSave={savePunchCard}
        saving={punchSaving}
        error={punchError}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Enable punch card</p>
            <p className="text-xs text-muted-foreground">Runs alongside points — each purchase earns both</p>
          </div>
          <Toggle checked={punchEnabled} onChange={setPunchEnabled} label="Enable punch card" />
        </div>
        {punchEnabled && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Target punches" hint="Recommended: 7–10">
              <Input
                type="number"
                min="1"
                max="20"
                placeholder="e.g. 8"
                value={punchTarget}
                onChange={e => setPunchTarget(e.target.value)}
              />
            </Field>
            <Field label="Completion reward" hint="Select from active rewards">
              {rewards.length === 0 ? (
                <p className="text-xs text-muted-foreground pt-1">
                  No active rewards yet.{' '}
                  <Link to="/owner/rewards" className="underline">
                    Create one first
                  </Link>
                  .
                </p>
              ) : (
                <select
                  value={punchRewardId}
                  onChange={e => setPunchRewardId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                >
                  <option value="">None</option>
                  {rewards.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              )}
            </Field>
          </div>
        )}
      </Section>

      {/* Per-product earn overrides */}
      {products.length > 0 && (
        <Section
          title="Per-product earn overrides"
          description="Override the default earn rule for specific products. Leave blank to use the default."
          onSave={saveOverrides}
          saving={overridesSaving}
          error={overridesError}
        >
          <div className="space-y-2">
            {products.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-sm flex-1 truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  ${(p.price_cents / 100).toFixed(2)}
                </span>
                <Input
                  type="number"
                  min="0"
                  placeholder="Default"
                  value={p.points_override}
                  onChange={e =>
                    setProducts(prev =>
                      prev.map((pp, j) => j === i ? { ...pp, points_override: e.target.value } : pp),
                    )
                  }
                  className="w-24 text-sm"
                />
                <span className="text-xs text-muted-foreground shrink-0">pts</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {toastMsg && <Toast message={toastMsg} onDone={clearToast} />}
    </div>
  )
}
