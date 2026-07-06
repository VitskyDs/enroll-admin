import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useLoyaltyProgram } from '@/hooks/useLoyaltyProgram'
import { Button } from '@vitskyds/enroll-ui'
import type { EarnRules, RewardTiersConfig, ReferralRules } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

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

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-foreground text-background text-sm px-4 py-2.5 shadow-lg">
      <Check size={14} />
      {message}
    </div>
  )
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="px-5 py-4 border-b">
        <h2 className="font-semibold text-sm">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </section>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OwnerProgram() {
  const { ownedBusinessId } = useAuth()
  const { program, loading } = useLoyaltyProgram(ownedBusinessId)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const [rewards, setRewards] = useState<ActiveReward[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])

  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(null), 3000)
    return () => clearTimeout(t)
  }, [toastMsg])

  // Load rewards + products (read-only display)
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

  function handleEditClick() {
    setToastMsg('Editing the program is coming soon')
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-2xl mx-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border h-32 animate-pulse bg-muted/30" />
        ))}
      </div>
    )
  }

  const earn = program?.earn_rules as EarnRules | undefined
  const tierConfig = program?.reward_tiers as RewardTiersConfig | undefined
  const tiers = tierConfig?.tiers ?? []
  const referral = program?.referral_rules as ReferralRules | undefined
  const punchRewardName = rewards.find(r => r.id === program?.punch_card_reward_id)?.name

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Loyalty program</h1>
        <Button size="sm" onClick={handleEditClick}>
          <Pencil size={14} />
          Edit
        </Button>
      </div>

      {/* Earn rules */}
      <Section title="Earn rules" description="How customers earn points.">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Points per dollar"
            value={earn?.points_per_dollar != null ? earn.points_per_dollar : 'Not set'}
          />
          <Field
            label="Points per visit"
            value={earn?.points_per_visit != null ? earn.points_per_visit : 'Not set'}
          />
        </div>
      </Section>

      {/* Birthday bonus */}
      <Section title="Birthday bonus">
        <Field
          label="Status"
          value={
            earn?.birthday_bonus_points
              ? `Enabled — ${earn.birthday_bonus_points} bonus points`
              : 'Disabled'
          }
        />
      </Section>

      {/* Tiers */}
      <Section title="Tiers" description="Customers progress through tiers based on lifetime points.">
        <div className="space-y-4">
          {tiers.map((tier, i) => (
            <div key={i} className="rounded-md border p-4 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{tier.name}</span>
                <span className="text-xs text-muted-foreground">Tier {i + 1}</span>
              </div>
              <p className="text-xs text-muted-foreground">{tier.min_points} lifetime points</p>
              {(tier.perks ?? (tier.perk ? [tier.perk] : [])).length > 0 && (
                <ul className="text-sm list-disc list-inside space-y-0.5">
                  {(tier.perks ?? (tier.perk ? [tier.perk] : [])).map((perk, pi) => (
                    <li key={pi}>{perk}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {tiers.length === 0 && (
            <p className="text-sm text-muted-foreground">No tiers configured.</p>
          )}
        </div>
      </Section>

      {/* Referral rules */}
      <Section title="Referral rules" description="Points awarded when a customer refers someone new.">
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Referrer points"
            value={referral?.referrer_points != null ? referral.referrer_points : 'Not set'}
          />
          <Field
            label="Referee points"
            value={referral?.referee_points != null ? referral.referee_points : 'Not set'}
          />
        </div>
      </Section>

      {/* Punch card */}
      <Section
        title="Punch card"
        description="Customers earn a punch per qualifying visit. When they hit the target, a reward unlocks automatically."
      >
        <Field label="Status" value={program?.punch_card_enabled ? 'Enabled' : 'Disabled'} />
        {program?.punch_card_enabled && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Target punches" value={program?.punch_card_target ?? 'Not set'} />
            <Field label="Completion reward" value={punchRewardName ?? 'None'} />
          </div>
        )}
      </Section>

      {/* Per-product earn overrides */}
      {products.length > 0 && (
        <Section
          title="Per-product earn overrides"
          description="Products with an earn rule that overrides the default."
        >
          <div className="space-y-2">
            {products.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-sm flex-1 truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  ${(p.price_cents / 100).toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground shrink-0 w-20 text-right">
                  {p.points_override !== '' ? `${p.points_override} pts` : 'Default'}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <p className="text-xs text-muted-foreground">
        Need to make changes? See{' '}
        <Link to="/owner/rewards" className="underline">
          rewards
        </Link>{' '}
        to manage the catalog, or use the Edit button above once the edit flow is available.
      </p>

      {toastMsg && <Toast message={toastMsg} />}
    </div>
  )
}
