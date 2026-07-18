import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@vitskyds/enroll-ui'
import { Button } from '@vitskyds/enroll-ui'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { value: 'food_and_beverage',      labelKey: 'admin.settings.industryFoodAndBeverage' },
  { value: 'health_and_beauty',      labelKey: 'admin.settings.industryHealthAndBeauty' },
  { value: 'fitness_and_wellness',   labelKey: 'admin.settings.industryFitnessAndWellness' },
  { value: 'retail_specialty',       labelKey: 'admin.settings.industryRetailSpecialty' },
  { value: 'retail_general',         labelKey: 'admin.settings.industryRetailGeneral' },
  { value: 'ecommerce',              labelKey: 'admin.settings.industryEcommerce' },
  { value: 'hospitality_and_travel', labelKey: 'admin.settings.industryHospitalityAndTravel' },
  { value: 'professional_services',  labelKey: 'admin.settings.industryProfessionalServices' },
  { value: 'automotive',             labelKey: 'admin.settings.industryAutomotive' },
  { value: 'grocery_and_pharmacy',   labelKey: 'admin.settings.industryGroceryAndPharmacy' },
  { value: 'financial_services',     labelKey: 'admin.settings.industryFinancialServices' },
  { value: 'entertainment',          labelKey: 'admin.settings.industryEntertainment' },
  { value: 'other',                  labelKey: 'admin.settings.industryOther' },
] as const

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-foreground text-background text-sm px-4 py-2.5 shadow-lg pointer-events-none">
      <Check size={14} />
      {message}
    </div>
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
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}

function ImageUploadField({
  label,
  preview,
  onFile,
}: {
  label: string
  preview: string | null
  onFile: (f: File) => void
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div
        onClick={() => ref.current?.click()}
        className={cn(
          'relative flex items-center justify-center rounded-lg border-2 border-dashed cursor-pointer hover:border-foreground/40 transition-colors aspect-square h-32 w-32',
          preview ? 'border-transparent overflow-hidden' : 'border-muted-foreground/30',
        )}
      >
        {preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <Upload size={18} />
            <span className="text-xs">{t('admin.rewards.clickToUpload')}</span>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => {
        const f = e.target.files?.[0]
        if (f) onFile(f)
      }} />
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OwnerSettings() {
  const { t } = useTranslation()
  const { ownedBusinessId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [originalSlug, setOriginalSlug] = useState('')
  const [slugAvailable, setSlugAvailable] = useState(false)
  const [tagline, setTagline] = useState('')
  const [industry, setIndustry] = useState('')
  const [address, setAddress] = useState('')
  const [hours, setHours] = useState('')
  const [brandColor, setBrandColor] = useState('#000000')
  const [currency, setCurrency] = useState<'' | 'usd' | 'ils'>('')
  const [currencyLocked, setCurrencyLocked] = useState(false)

  // Image state
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)

  useEffect(() => {
    if (!ownedBusinessId) return
    let ignore = false
    supabase
      .from('businesses')
      .select('name, slug, tagline, industry, address, hours, brand_color, logo_url, currency')
      .eq('id', ownedBusinessId)
      .single()
      .then(({ data }) => {
        if (ignore || !data) return
        setName(data.name ?? '')
        setSlug(data.slug ?? '')
        setOriginalSlug(data.slug ?? '')
        setTagline(data.tagline ?? '')
        setIndustry(data.industry ?? '')
        setAddress(data.address ?? '')
        setHours(data.hours ?? '')
        setBrandColor(data.brand_color ?? '#000000')
        const loadedCurrency = data.currency === 'usd' || data.currency === 'ils' ? data.currency : ''
        setCurrency(loadedCurrency)
        setCurrencyLocked(loadedCurrency !== '')
        setLogoPreview(data.logo_url ?? null)
        setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [ownedBusinessId])

  // ── Slug validation ────────────────────────────────────────────────────────

  // Uniqueness check — exclude own business. Shared by the live-typing check below
  // and handleSave, so a taken slug is always caught regardless of UI timing.
  const isSlugTaken = useCallback(async (value: string): Promise<boolean> => {
    const { data } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', value)
      .neq('id', ownedBusinessId!)
      .maybeSingle()
    return !!data
  }, [ownedBusinessId])

  // Called from the slug input's onChange (an event handler, not an effect) so format
  // errors and the revert-when-cleared behavior apply the instant the owner types.
  function handleSlugChange(rawValue: string) {
    const value = rawValue.toLowerCase()
    const next = value === '' ? originalSlug : value
    setSlug(next)
    setSlugAvailable(false)
    setErrors(prev => {
      if (next === originalSlug) { if (!prev.slug) return prev; const n = { ...prev }; delete n.slug; return n }
      if (!SLUG_RE.test(next)) return { ...prev, slug: t('admin.settings.slugFormatInvalid') }
      if (!prev.slug) return prev
      const n = { ...prev }; delete n.slug; return n
    })
  }

  // Debounces the availability check against the DB once the slug has changed and
  // passes the format check — the synchronous cases above are handled in the onChange.
  useEffect(() => {
    if (!ownedBusinessId || slug === originalSlug || !SLUG_RE.test(slug)) return
    const handle = setTimeout(async () => {
      const taken = await isSlugTaken(slug)
      setSlugAvailable(!taken)
      setErrors(prev => {
        if (!taken) { if (!prev.slug) return prev; const n = { ...prev }; delete n.slug; return n }
        return { ...prev, slug: t('admin.settings.slugTaken') }
      })
    }, 400)
    return () => clearTimeout(handle)
  }, [slug, originalSlug, ownedBusinessId, isSlugTaken])

  // ── Image upload ───────────────────────────────────────────────────────────

  async function uploadImage(file: File, bucket: string, pathPrefix: string): Promise<string | null> {
    const ext = file.name.split('.').pop()
    const path = `${pathPrefix}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) return null
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    const trimmedSlug = slug.trim()
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = t('admin.settings.businessNameRequired')
    if (!trimmedSlug) errs.slug = t('admin.settings.slugRequired')
    else if (!SLUG_RE.test(trimmedSlug)) errs.slug = t('admin.settings.slugFormatInvalid')
    if (Object.keys(errs).length) { setErrors(errs); return }

    if (await isSlugTaken(trimmedSlug)) {
      setErrors(prev => ({ ...prev, slug: t('admin.settings.slugTaken') }))
      return
    }

    setSaving(true)

    let logoUrl: string | undefined

    if (logoFile) {
      const url = await uploadImage(logoFile, 'business-assets', `${ownedBusinessId}/logo`)
      if (url) { logoUrl = url; setLogoPreview(url) }
    }

    const payload: Record<string, string | null> = {
      name: name.trim(),
      slug: slug.trim(),
      tagline: tagline.trim() || null,
      industry: industry || null,
      address: address.trim() || null,
      hours: hours.trim() || null,
      brand_color: brandColor,
      currency: currency || null,
      ...(logoUrl ? { logo_url: logoUrl } : {}),
    }

    const { error } = await supabase
      .from('businesses')
      .update(payload)
      .eq('id', ownedBusinessId!)

    setSaving(false)
    if (error) { setErrors({ save: error.message }); return }

    setOriginalSlug(trimmedSlug)
    setSlugAvailable(false)
    setLogoFile(null)
    if (currency) setCurrencyLocked(true)
    setToast(t('admin.settings.settingsSaved'))
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-7 w-40" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">{t('admin.settings.pageTitle')}</h1>

      {/* Basic info */}
      <section className="rounded-lg border bg-card">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-sm">{t('admin.settings.basicInfoTitle')}</h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <Field label={t('admin.settings.businessNameLabel')} error={errors.name}>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('admin.settings.businessNamePlaceholder')}
            />
          </Field>
          <Field
            label={t('admin.settings.slugLabel')}
            hint={t('admin.settings.slugHint')}
            error={errors.slug}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">enroll.app/join/</span>
              <div className="relative flex-1">
                <Input
                  value={slug}
                  onChange={e => handleSlugChange(e.target.value)}
                  className={cn(errors.slug && 'border-destructive focus-visible:ring-destructive')}
                  placeholder="corner-cup"
                />
                {slugAvailable && (
                  <Check
                    size={14}
                    role="img"
                    aria-label={t('admin.settings.slugAvailableAriaLabel')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-600"
                  />
                )}
              </div>
            </div>
          </Field>
          <Field label={t('admin.settings.taglineLabel')}>
            <Input
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              placeholder={t('admin.settings.taglinePlaceholder')}
            />
          </Field>
          <Field label={t('admin.settings.industryLabel')}>
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
            >
              <option value="">{t('admin.settings.selectIndustryPlaceholder')}</option>
              {INDUSTRIES.map(i => (
                <option key={i.value} value={i.value}>{t(i.labelKey)}</option>
              ))}
            </select>
          </Field>
          <Field label={t('admin.settings.addressLabel')}>
            <Input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder={t('admin.settings.addressPlaceholder')}
            />
          </Field>
          <Field label={t('admin.settings.hoursLabel')} hint={t('admin.settings.hoursHint')}>
            <Input
              value={hours}
              onChange={e => setHours(e.target.value)}
              placeholder={t('admin.settings.hoursPlaceholder')}
            />
          </Field>
        </div>
      </section>

      {/* Images */}
      <section className="rounded-lg border bg-card">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-sm">{t('admin.settings.imagesTitle')}</h2>
        </div>
        <div className="px-5 py-4">
          <ImageUploadField
            label={t('admin.settings.logoLabel')}
            preview={logoPreview}
            onFile={f => { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)) }}
          />
        </div>
      </section>

      {/* Store currency */}
      <section className="rounded-lg border bg-card">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-sm">{t('admin.settings.currencyTitle')}</h2>
        </div>
        <div className="px-5 py-4">
          <Field
            label={t('admin.settings.currencyLabel')}
            hint={
              currencyLocked
                ? t('admin.settings.currencyLockedHint')
                : t('admin.settings.currencyUnlockedHint')
            }
          >
            {currencyLocked ? (
              <div className="px-3 py-1 rounded-full bg-secondary text-sm font-medium w-fit">
                {currency === 'usd' ? '$ USD' : '₪ ILS'}
              </div>
            ) : (
              <div className="flex items-center gap-1 rounded-full bg-secondary p-1 w-fit">
                {([
                  { value: '', label: t('admin.settings.currencyNotSet') },
                  { value: 'usd', label: '$ USD' },
                  { value: 'ils', label: '₪ ILS' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCurrency(opt.value)}
                    aria-pressed={currency === opt.value}
                    className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium transition-colors',
                      currency === opt.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </Field>
        </div>
      </section>

      {/* Brand color */}
      <section className="rounded-lg border bg-card">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-sm">{t('admin.settings.brandColorTitle')}</h2>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={brandColor}
              onChange={e => setBrandColor(e.target.value)}
              className="h-9 w-9 rounded-md border border-input cursor-pointer p-0.5"
            />
            <Input
              value={brandColor}
              onChange={e => {
                const v = e.target.value
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setBrandColor(v)
              }}
              dir="ltr"
              className="w-32 font-mono text-sm text-left"
              placeholder="#000000"
            />
            <div
              className="h-9 w-16 rounded-md border shrink-0"
              style={{ backgroundColor: brandColor }}
            />
          </div>
        </div>
      </section>

      {errors.save && <p className="text-sm text-destructive">{errors.save}</p>}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? t('common.saving') : t('admin.settings.saveChanges')}
      </Button>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
