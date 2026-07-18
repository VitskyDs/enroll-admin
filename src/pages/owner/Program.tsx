import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Pencil, Check, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useLoyaltyProgram } from '@/hooks/useLoyaltyProgram'
import { writeCache } from '@/lib/query-cache'
import { Button } from '@vitskyds/enroll-ui'
import { cn } from '@/lib/utils'
import type { EarnRules, RewardTiersConfig, ReferralRules } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

type ProductRow = {
  id: string
  name: string
  price_cents: number
  points_override: string
}

type ActiveProduct = {
  id: string
  name: string
  category: string | null
}

type PunchRewardMode = 'products' | 'category'

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

// ─── Punch card reward editor ───────────────────────────────────────────────

function PunchCardRewardEditor({
  activeProducts,
  categories,
  mode,
  onModeChange,
  selectedProductIds,
  onProductsChange,
  selectedCategory,
  onCategoryChange,
  onSave,
  saving,
  error,
}: {
  activeProducts: ActiveProduct[]
  categories: string[]
  mode: PunchRewardMode
  onModeChange: (mode: PunchRewardMode) => void
  selectedProductIds: string[]
  onProductsChange: (ids: string[]) => void
  selectedCategory: string
  onCategoryChange: (category: string) => void
  onSave: () => void
  saving: boolean
  error: string | null
}) {
  const { t } = useTranslation()
  const categoryOptions = selectedCategory && !categories.includes(selectedCategory)
    ? [selectedCategory, ...categories]
    : categories
  const productsInSelectedCategory = activeProducts.filter(p => p.category === selectedCategory)
  const categoryHasNoProducts = mode === 'category' && selectedCategory !== '' && productsInSelectedCategory.length === 0

  function toggleProduct(id: string) {
    onProductsChange(
      selectedProductIds.includes(id)
        ? selectedProductIds.filter(p => p !== id)
        : [...selectedProductIds, id],
    )
  }

  return (
    <fieldset className="space-y-2.5">
      <legend className="text-sm font-medium">{t('admin.program.completionReward')}</legend>

      <div role="radiogroup" aria-label={t('admin.program.rewardTypeLabel')} className="inline-flex rounded-md border p-0.5 bg-muted/30">
        {(['products', 'category'] as PunchRewardMode[]).map(m => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => onModeChange(m)}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-sm transition-colors',
              mode === m ? 'bg-background shadow-sm' : 'text-muted-foreground',
            )}
          >
            {m === 'products' ? t('admin.program.specificProducts') : t('admin.program.categoryTab')}
          </button>
        ))}
      </div>

      {mode === 'products' && (
        activeProducts.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('admin.program.noActiveProducts')}</p>
        ) : (
          <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
            {activeProducts.map(p => (
              <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-muted/20">
                <input
                  type="checkbox"
                  checked={selectedProductIds.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                  className="h-3.5 w-3.5 rounded border-input"
                />
                <span className="flex-1 truncate">{p.name}</span>
                {p.category && <span className="text-xs text-muted-foreground shrink-0">{p.category}</span>}
              </label>
            ))}
          </div>
        )
      )}

      {mode === 'category' && (
        categoryOptions.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('admin.program.noCategories')}</p>
        ) : (
          <select
            aria-label={t('admin.program.rewardCategoryLabel')}
            value={selectedCategory}
            onChange={e => onCategoryChange(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
          >
            <option value="">{t('admin.program.selectCategoryOption')}</option>
            {categoryOptions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )
      )}

      {categoryHasNoProducts && (
        <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          {t('admin.program.categoryEmptyWarning')}
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button size="sm" onClick={onSave} disabled={saving || categoryHasNoProducts}>
          {saving ? t('common.saving') : t('admin.program.saveReward')}
        </Button>
      </div>
    </fieldset>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OwnerProgram() {
  const { t } = useTranslation()
  const { ownedBusinessId } = useAuth()
  const { program, loading } = useLoyaltyProgram(ownedBusinessId)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const [products, setProducts] = useState<ProductRow[]>([])
  const [activeProducts, setActiveProducts] = useState<ActiveProduct[]>([])

  const [rewardMode, setRewardMode] = useState<PunchRewardMode>('products')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [rewardSaving, setRewardSaving] = useState(false)
  const [rewardError, setRewardError] = useState<string | null>(null)

  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(null), 3000)
    return () => clearTimeout(t)
  }, [toastMsg])

  // Load products (read-only per-product overrides display + active list for the punch card reward picker)
  useEffect(() => {
    if (!ownedBusinessId) return
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

    supabase
      .from('products')
      .select('id, name, category')
      .eq('business_id', ownedBusinessId)
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => setActiveProducts(data ?? []))
  }, [ownedBusinessId])

  // Seed the punch card reward editor from the loaded program
  useEffect(() => {
    if (!program) return
    setRewardMode(program.punch_card_reward_type === 'category' ? 'category' : 'products')
    setSelectedProductIds(program.punch_card_reward_product_ids ?? [])
    setSelectedCategory(program.punch_card_reward_category ?? '')
  }, [program])

  function handleEditClick() {
    setToastMsg(t('admin.program.editComingSoon'))
  }

  async function saveReward() {
    setRewardError(null)
    if (rewardMode === 'products') {
      if (selectedProductIds.length === 0) {
        setRewardError(t('admin.program.selectAtLeastOneProduct'))
        return
      }
    } else {
      if (!selectedCategory) {
        setRewardError(t('admin.program.selectCategoryError'))
        return
      }
      if (!activeProducts.some(p => p.category === selectedCategory)) {
        setRewardError(t('admin.program.categoryNoProductsError'))
        return
      }
    }

    const payload =
      rewardMode === 'products'
        ? {
            punch_card_reward_type: 'products' as const,
            punch_card_reward_product_ids: selectedProductIds,
            punch_card_reward_category: null,
          }
        : {
            punch_card_reward_type: 'category' as const,
            punch_card_reward_product_ids: null,
            punch_card_reward_category: selectedCategory,
          }

    setRewardSaving(true)
    const { error } = await supabase
      .from('loyalty_programs')
      .update(payload)
      .eq('business_id', ownedBusinessId!)
    setRewardSaving(false)
    if (error) {
      setRewardError(error.message)
      return
    }
    if (program) writeCache('loyaltyProgram', ownedBusinessId!, { ...program, ...payload })
    setToastMsg(t('admin.program.rewardSaved'))
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
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
  const rewardCategories = Array.from(
    new Set(activeProducts.map(p => p.category).filter((c): c is string => !!c)),
  ).sort()

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('admin.nav.program')}</h1>
        <Button size="sm" onClick={handleEditClick}>
          <Pencil size={14} />
          {t('admin.program.edit')}
        </Button>
      </div>

      {/* Earn rules */}
      <Section title={t('admin.program.earnRulesTitle')} description={t('admin.program.earnRulesDesc')}>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label={t('admin.program.pointsPerDollar')}
            value={earn?.points_per_dollar != null ? earn.points_per_dollar : t('admin.program.notSet')}
          />
          <Field
            label={t('admin.program.pointsPerVisit')}
            value={earn?.points_per_visit != null ? earn.points_per_visit : t('admin.program.notSet')}
          />
        </div>
      </Section>

      {/* Birthday bonus */}
      <Section title={t('admin.program.birthdayBonusTitle')}>
        <Field
          label={t('admin.program.status')}
          value={
            earn?.birthday_bonus_points
              ? t('admin.program.birthdayEnabled', { count: earn.birthday_bonus_points })
              : t('admin.program.disabled')
          }
        />
      </Section>

      {/* Tiers */}
      <Section title={t('admin.program.tiersTitle')} description={t('admin.program.tiersDesc')}>
        <div className="space-y-4">
          {tiers.map((tier, i) => (
            <div key={i} className="rounded-md border p-4 space-y-2 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{tier.name}</span>
                <span className="text-xs text-muted-foreground">{t('admin.program.tierLabel', { n: i + 1 })}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t('admin.program.tierLifetimePoints', { count: tier.min_points })}</p>
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
            <p className="text-sm text-muted-foreground">{t('admin.program.noTiers')}</p>
          )}
        </div>
      </Section>

      {/* Referral rules */}
      <Section title={t('admin.program.referralRulesTitle')} description={t('admin.program.referralRulesDesc')}>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label={t('admin.program.referrerPoints')}
            value={referral?.referrer_points != null ? referral.referrer_points : t('admin.program.notSet')}
          />
          <Field
            label={t('admin.program.refereePoints')}
            value={referral?.referee_points != null ? referral.referee_points : t('admin.program.notSet')}
          />
        </div>
      </Section>

      {/* Punch card */}
      <Section
        title={t('admin.program.punchCardTitle')}
        description={t('admin.program.punchCardDesc')}
      >
        <Field label={t('admin.program.status')} value={program?.punch_card_enabled ? t('admin.program.enabled') : t('admin.program.disabled')} />
        {program?.punch_card_enabled && (
          <>
            <Field label={t('admin.program.targetPunches')} value={program?.punch_card_target ?? t('admin.program.notSet')} />
            <PunchCardRewardEditor
              activeProducts={activeProducts}
              categories={rewardCategories}
              mode={rewardMode}
              onModeChange={setRewardMode}
              selectedProductIds={selectedProductIds}
              onProductsChange={setSelectedProductIds}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              onSave={saveReward}
              saving={rewardSaving}
              error={rewardError}
            />
          </>
        )}
      </Section>

      {/* Per-product earn overrides */}
      {products.length > 0 && (
        <Section
          title={t('admin.program.productOverridesTitle')}
          description={t('admin.program.productOverridesDesc')}
        >
          <div className="space-y-2">
            {products.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-sm flex-1 truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  ${(p.price_cents / 100).toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground shrink-0 w-20 text-right">
                  {p.points_override !== '' ? t('admin.customers.ptsSuffix', { count: p.points_override }) : t('admin.program.defaultOverride')}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <p className="text-xs text-muted-foreground">
        {t('admin.program.editNoteBefore')}{' '}
        <Link to="/owner/rewards" className="underline">
          {t('admin.nav.rewards')}
        </Link>{' '}
        {t('admin.program.editNoteAfter')}
      </p>

      {toastMsg && <Toast message={toastMsg} />}
    </div>
  )
}
