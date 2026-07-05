import { useState, useEffect, useRef } from 'react'
import { Upload, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@vitskyds/enroll-ui'
import { Button } from '@vitskyds/enroll-ui'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  { value: 'food_and_beverage',     label: 'Food & beverage' },
  { value: 'health_and_beauty',     label: 'Health & beauty' },
  { value: 'fitness_and_wellness',  label: 'Fitness & wellness' },
  { value: 'retail_specialty',      label: 'Retail — specialty' },
  { value: 'retail_general',        label: 'Retail — general' },
  { value: 'ecommerce',             label: 'E-commerce' },
  { value: 'hospitality_and_travel',label: 'Hospitality & travel' },
  { value: 'professional_services', label: 'Professional services' },
  { value: 'automotive',            label: 'Automotive' },
  { value: 'grocery_and_pharmacy',  label: 'Grocery & pharmacy' },
  { value: 'financial_services',    label: 'Financial services' },
  { value: 'entertainment',         label: 'Entertainment' },
  { value: 'other',                 label: 'Other' },
]

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
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div
        onClick={() => ref.current?.click()}
        className={cn(
          'relative flex items-center justify-center rounded-lg border-2 border-dashed cursor-pointer hover:border-foreground/40 transition-colors',
          preview ? 'border-transparent overflow-hidden h-32' : 'border-muted-foreground/30 h-24',
        )}
      >
        {preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <Upload size={18} />
            <span className="text-xs">Click to upload</span>
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
  const { ownedBusinessId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [tagline, setTagline] = useState('')
  const [industry, setIndustry] = useState('')
  const [address, setAddress] = useState('')
  const [hours, setHours] = useState('')
  const [brandColor, setBrandColor] = useState('#000000')
  const [currency, setCurrency] = useState<'' | 'usd' | 'ils'>('')

  // Image state
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)

  useEffect(() => {
    if (!ownedBusinessId) return
    supabase
      .from('businesses')
      .select('name, slug, tagline, industry, address, hours, brand_color, logo_url, cover_image_url, currency')
      .eq('id', ownedBusinessId)
      .single()
      .then(({ data }) => {
        if (!data) return
        setName(data.name ?? '')
        setSlug(data.slug ?? '')
        setTagline(data.tagline ?? '')
        setIndustry(data.industry ?? '')
        setAddress(data.address ?? '')
        setHours(data.hours ?? '')
        setBrandColor(data.brand_color ?? '#000000')
        setCurrency(data.currency === 'usd' || data.currency === 'ils' ? data.currency : '')
        setLogoPreview(data.logo_url ?? null)
        setCoverPreview(data.cover_image_url ?? null)
        setLoading(false)
      })
  }, [ownedBusinessId])

  // ── Slug validation ────────────────────────────────────────────────────────

  async function validateSlug(value: string) {
    if (!value) return
    const errs = { ...errors }
    if (!SLUG_RE.test(value)) {
      errs.slug = 'Slug must be lowercase letters, numbers, and hyphens only.'
      setErrors(errs)
      return
    }
    // Uniqueness check — exclude own business
    const { data } = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', value)
      .neq('id', ownedBusinessId!)
      .maybeSingle()
    if (data) {
      setErrors(prev => ({ ...prev, slug: 'This slug is already taken.' }))
    } else {
      setErrors(prev => { const n = { ...prev }; delete n.slug; return n })
    }
  }

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
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Business name is required.'
    if (!slug.trim()) errs.slug = 'Slug is required.'
    else if (!SLUG_RE.test(slug)) errs.slug = 'Slug must be lowercase letters, numbers, and hyphens only.'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)

    let logoUrl: string | undefined
    let coverUrl: string | undefined

    if (logoFile) {
      const url = await uploadImage(logoFile, 'business-assets', `${ownedBusinessId}/logo`)
      if (url) { logoUrl = url; setLogoPreview(url) }
    }
    if (coverFile) {
      const url = await uploadImage(coverFile, 'business-assets', `${ownedBusinessId}/cover`)
      if (url) { coverUrl = url; setCoverPreview(url) }
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
      ...(coverUrl ? { cover_image_url: coverUrl } : {}),
    }

    const { error } = await supabase
      .from('businesses')
      .update(payload)
      .eq('id', ownedBusinessId!)

    setSaving(false)
    if (error) { setErrors({ save: error.message }); return }

    setLogoFile(null)
    setCoverFile(null)
    setToast('Settings saved')
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
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
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Business profile</h1>

      {/* Basic info */}
      <section className="rounded-lg border bg-card">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-sm">Basic info</h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <Field label="Business name" error={errors.name}>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Corner Cup"
            />
          </Field>
          <Field
            label="Slug"
            hint="Used in your enrollment link. Lowercase letters, numbers, and hyphens."
            error={errors.slug}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">enroll.app/join/</span>
              <Input
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase())}
                onBlur={e => validateSlug(e.target.value)}
                placeholder="corner-cup"
              />
            </div>
          </Field>
          <Field label="Tagline">
            <Input
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              placeholder="Your neighborhood coffee shop"
            />
          </Field>
          <Field label="Industry">
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map(i => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Address">
            <Input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="123 Main St, City, State"
            />
          </Field>
          <Field label="Hours" hint="e.g. Mon–Fri 7am–6pm, Sat–Sun 8am–4pm">
            <Input
              value={hours}
              onChange={e => setHours(e.target.value)}
              placeholder="Mon–Fri 7am–6pm"
            />
          </Field>
        </div>
      </section>

      {/* Images */}
      <section className="rounded-lg border bg-card">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-sm">Images</h2>
        </div>
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ImageUploadField
            label="Logo"
            preview={logoPreview}
            onFile={f => { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)) }}
          />
          <ImageUploadField
            label="Cover image"
            preview={coverPreview}
            onFile={f => { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)) }}
          />
        </div>
      </section>

      {/* Store currency */}
      <section className="rounded-lg border bg-card">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-sm">Store currency</h2>
        </div>
        <div className="px-5 py-4">
          <Field
            label="Currency"
            hint="Locking a currency hides the switcher for customers — they'll always see this currency."
          >
            <div className="flex items-center gap-1 rounded-full bg-secondary p-1 w-fit">
              {([
                { value: '', label: 'Not set' },
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
          </Field>
        </div>
      </section>

      {/* Brand color */}
      <section className="rounded-lg border bg-card">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-sm">Brand color</h2>
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
              className="w-32 font-mono text-sm"
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
        {saving ? 'Saving…' : 'Save changes'}
      </Button>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
