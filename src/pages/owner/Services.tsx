import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { Plus, Pencil, Wrench, X, Check, Upload, Trash2, TriangleAlert, Repeat } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useLoyaltyProgram } from '@/hooks/useLoyaltyProgram'
import { useCurrency } from '@/contexts/CurrencyContext'
import type { EarnRules, Service } from '@/types'
import { Input } from '@vitskyds/enroll-ui'
import { Button } from '@vitskyds/enroll-ui'
import { Switch } from '@vitskyds/enroll-ui'
import { cn, formatPrice, formatCurrencyUnit } from '@/lib/utils'
import { Drawer } from '@/components/owner/drawer'

// ─── Types ───────────────────────────────────────────────────────────────────

type ServiceStatus = Service['status']
type SubscriptionInterval = 'weekly' | 'monthly'

// Points a service earns by default, derived from its price and the program's
// points-per-dollar earn rule. Returns null when no rate is configured.
function derivePoints(priceDollars: number, pointsPerDollar: number | null): number | null {
  if (pointsPerDollar == null || !isFinite(priceDollars)) return null
  return Math.floor(priceDollars * pointsPerDollar)
}

type FormDraft = {
  name: string
  description: string
  price_dollars: string
  category: string
  points_value: string
  status: ServiceStatus
  imageFile: File | null
  imagePreview: string | null
  subscriptionEnabled: boolean
  subscriptionInterval: SubscriptionInterval
  subscriptionPriceDollars: string
}

const EMPTY_DRAFT: FormDraft = {
  name: '',
  description: '',
  price_dollars: '',
  category: '',
  points_value: '',
  status: 'active',
  imageFile: null,
  imagePreview: null,
  subscriptionEnabled: false,
  subscriptionInterval: 'monthly',
  subscriptionPriceDollars: '',
}

const STATUS_CYCLE: Record<ServiceStatus, ServiceStatus> = {
  active: 'inactive',
  inactive: 'draft',
  draft: 'active',
}

function statusLabel(t: TFunction, status: ServiceStatus): string {
  if (status === 'active') return t('status.active')
  if (status === 'draft') return t('admin.services.statusDraft')
  return t('status.inactive')
}

const STATUS_COLORS: Record<ServiceStatus, string> = {
  active: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400',
  draft: 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-400',
  inactive: 'text-zinc-500 bg-zinc-50 border-zinc-200 dark:bg-zinc-800/30 dark:border-zinc-700',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({
  message,
  variant = 'success',
  onDone,
}: {
  message: string
  variant?: 'success' | 'error'
  onDone: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg text-sm px-4 py-2.5 shadow-lg pointer-events-none',
        variant === 'error' ? 'bg-destructive text-white/95' : 'bg-foreground text-background',
      )}
    >
      {variant === 'error' ? <TriangleAlert size={14} /> : <Check size={14} />}
      {message}
    </div>
  )
}

function DeleteConfirm({
  title,
  message,
  onCancel,
  onConfirm,
  deleting,
}: {
  title: string
  message: string
  onCancel: () => void
  onConfirm: () => void
  deleting: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-lg border bg-background p-5 shadow-xl space-y-4">
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={deleting}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={deleting}>
            {deleting ? t('common.deleting') : t('common.delete')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Service form drawer ───────────────────────────────────────────────────────

function ServiceForm({
  open,
  draft,
  pointsPerDollar,
  onChange,
  onSave,
  onClose,
  onDelete,
  saving,
  error,
  mode,
}: {
  open: boolean
  draft: FormDraft
  pointsPerDollar: number | null
  onChange: (patch: Partial<FormDraft>) => void
  onSave: () => void
  onClose: () => void
  onDelete: () => void
  saving: boolean
  error: string | null
  mode: 'add' | 'edit'
}) {
  const { t } = useTranslation()
  const { currency } = useCurrency()
  const { i18n } = useTranslation()
  const derivedPoints = derivePoints(Number(draft.price_dollars), pointsPerDollar)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onChange({
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    })
  }

  return (
    <Drawer open={open} onClose={onClose} side="right" className="w-full max-w-md border-l flex flex-col">
      <>
        <div className="flex items-center justify-between h-14 border-b px-5 shrink-0">
          <span className="font-semibold text-sm">{mode === 'add' ? t('admin.services.addTitle') : t('admin.services.editTitle')}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Image */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('admin.services.imageLabel')}</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={cn(
                'relative flex items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-colors hover:border-foreground/40',
                draft.imagePreview ? 'border-transparent p-0 overflow-hidden' : 'border-muted-foreground/30 h-32',
              )}
            >
              {draft.imagePreview ? (
                <img
                  src={draft.imagePreview}
                  alt={t('admin.services.previewAlt')}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload size={20} />
                  <span className="text-xs">{t('admin.rewards.clickToUpload')}</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('admin.services.nameLabel')} <span className="text-destructive">*</span></label>
            <Input
              value={draft.name}
              onChange={e => onChange({ name: e.target.value })}
              placeholder={t('admin.services.namePlaceholder')}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('admin.services.descriptionLabel')}</label>
            <textarea
              value={draft.description}
              onChange={e => onChange({ description: e.target.value })}
              placeholder={t('admin.services.descriptionPlaceholder')}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Price + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('admin.services.priceLabel')} <span className="text-destructive">*</span></label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                  {formatCurrencyUnit(currency, i18n.language)}
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  dir="ltr"
                  value={draft.price_dollars}
                  onChange={e => onChange({ price_dollars: e.target.value })}
                  className="pl-7 text-left"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('admin.services.categoryLabel')}</label>
              <Input
                value={draft.category}
                onChange={e => onChange({ category: e.target.value })}
                placeholder={t('admin.services.categoryPlaceholder')}
              />
            </div>
          </div>

          {/* Points + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('admin.services.pointsEarnedLabel')}</label>
              <Input
                type="number"
                min="0"
                placeholder={derivedPoints != null ? String(derivedPoints) : t('admin.services.pointsDefaultPlaceholder')}
                value={draft.points_value}
                onChange={e => onChange({ points_value: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {derivedPoints != null
                  ? t('admin.services.pointsDefaultsFromPrice')
                  : t('admin.services.pointsSetRate')}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('admin.services.statusLabel')}</label>
              <select
                value={draft.status}
                onChange={e => onChange({ status: e.target.value as ServiceStatus })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              >
                <option value="active">{t('status.active')}</option>
                <option value="draft">{t('admin.services.statusDraft')}</option>
                <option value="inactive">{t('status.inactive')}</option>
              </select>
            </div>
          </div>

          {/* Subscription plan */}
          <div className="rounded-lg border p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Repeat size={14} className="text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">{t('admin.services.subscriptionToggleLabel')}</span>
              </div>
              <Switch
                checked={draft.subscriptionEnabled}
                onChange={v => onChange({ subscriptionEnabled: v })}
                aria-label={t('admin.services.subscriptionToggleLabel')}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t('admin.services.subscriptionToggleHint')}</p>

            {draft.subscriptionEnabled && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t('admin.services.subscriptionIntervalLabel')}</label>
                  <select
                    value={draft.subscriptionInterval}
                    onChange={e => onChange({ subscriptionInterval: e.target.value as SubscriptionInterval })}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                  >
                    <option value="weekly">{t('admin.services.subscriptionIntervalWeekly')}</option>
                    <option value="monthly">{t('admin.services.subscriptionIntervalMonthly')}</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">{t('admin.services.subscriptionPriceLabel')} <span className="text-destructive">*</span></label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                      {formatCurrencyUnit(currency, i18n.language)}
                    </span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      dir="ltr"
                      value={draft.subscriptionPriceDollars}
                      onChange={e => onChange({ subscriptionPriceDollars: e.target.value })}
                      className="pl-7 text-left"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="border-t p-4 shrink-0 space-y-3">
          <Button className="w-full" onClick={onSave} disabled={saving}>
            {saving ? t('common.saving') : mode === 'add' ? t('admin.services.addTitle') : t('admin.services.saveChanges')}
          </Button>
          {mode === 'edit' && (
            <>
              <div className="border-t" />
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={onDelete}
                disabled={saving}
              >
                <Trash2 size={14} />
                {t('admin.services.deleteButtonTitle')}
              </Button>
            </>
          )}
        </div>
      </>
    </Drawer>
  )
}

// ─── Service row ────────────────────────────────────────────────────────────

function ServiceRow({
  service,
  pointsPerDollar,
  onEdit,
  onStatusToggle,
}: {
  service: Service
  pointsPerDollar: number | null
  onEdit: () => void
  onStatusToggle: () => void
}) {
  const { t, i18n } = useTranslation()
  const { currency } = useCurrency()
  const points = service.points_value ?? derivePoints((service.price_cents ?? 0) / 100, pointsPerDollar)
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 bg-card">
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-md overflow-hidden border shrink-0 bg-muted flex items-center justify-center">
        {service.image_url ? (
          <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
        ) : (
          <Wrench size={16} className="text-muted-foreground/40" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{service.name}</span>
          {service.category && (
            <span className="text-xs text-muted-foreground">{service.category}</span>
          )}
          {service.subscription_enabled && (
            <span className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Repeat size={10} />
              {service.subscription_interval === 'weekly'
                ? t('admin.services.subscriptionIntervalWeekly')
                : t('admin.services.subscriptionIntervalMonthly')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span>{formatPrice(service.price_cents ?? 0, currency, i18n.language)}</span>
          {points != null && (
            <>
              <span>·</span>
              <span>{t('admin.customers.ptsSuffix', { count: points })}</span>
            </>
          )}
          {service.subscription_enabled && service.subscription_price_cents != null && (
            <>
              <span>·</span>
              <span>{formatPrice(service.subscription_price_cents, currency, i18n.language)}/{service.subscription_interval === 'weekly' ? t('admin.services.subscriptionIntervalWeekly').toLowerCase() : t('admin.services.subscriptionIntervalMonthly').toLowerCase()}</span>
            </>
          )}
        </div>
      </div>

      {/* Status toggle */}
      <button
        onClick={onStatusToggle}
        title={t('admin.services.cycleStatusTitle')}
        className={cn(
          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 transition-colors',
          STATUS_COLORS[service.status],
        )}
      >
        {statusLabel(t, service.status)}
      </button>

      {/* Edit */}
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onEdit}>
        <Pencil size={14} />
      </Button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OwnerServices() {
  const { t } = useTranslation()
  const { ownedBusinessId } = useAuth()
  const { program } = useLoyaltyProgram(ownedBusinessId)
  const pointsPerDollar = (program?.earn_rules as EarnRules | undefined)?.points_per_dollar ?? null
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<FormDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success')
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    if (!ownedBusinessId) return
    setLoading(true)
    const { data } = await supabase
      .from('services')
      .select('id, business_id, name, description, price_cents, category, status, image_url, points_value, subscription_enabled, subscription_interval, subscription_price_cents')
      .eq('business_id', ownedBusinessId)
      .order('name')
    setServices((data ?? []) as Service[])
    setLoading(false)
  }, [ownedBusinessId])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setFormError(null)
    setDrawerOpen(true)
  }

  function openEdit(service: Service) {
    setEditingId(service.id)
    setDraft({
      name: service.name,
      description: service.description ?? '',
      price_dollars: ((service.price_cents ?? 0) / 100).toFixed(2),
      category: service.category ?? '',
      points_value: service.points_value != null ? String(service.points_value) : '',
      status: service.status,
      imageFile: null,
      imagePreview: service.image_url,
      subscriptionEnabled: service.subscription_enabled,
      subscriptionInterval: service.subscription_interval ?? 'monthly',
      subscriptionPriceDollars: service.subscription_price_cents != null ? (service.subscription_price_cents / 100).toFixed(2) : '',
    })
    setFormError(null)
    setDrawerOpen(true)
  }

  async function uploadImage(file: File): Promise<{ url: string } | { error: string }> {
    const ext = file.name.split('.').pop()
    const path = `${ownedBusinessId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('service-images').upload(path, file)
    if (error) return { error: error.message }
    const { data } = supabase.storage.from('service-images').getPublicUrl(path)
    return { url: data.publicUrl }
  }

  async function handleSave() {
    setFormError(null)
    if (!draft.name.trim()) { setFormError(t('admin.services.nameRequired')); return }
    if (draft.price_dollars === '' || isNaN(Number(draft.price_dollars))) {
      setFormError(t('admin.services.priceRequired'))
      return
    }
    if (draft.subscriptionEnabled && (draft.subscriptionPriceDollars === '' || isNaN(Number(draft.subscriptionPriceDollars)) || Number(draft.subscriptionPriceDollars) <= 0)) {
      setFormError(t('admin.services.subscriptionPriceRequired'))
      return
    }
    setSaving(true)

    let imageUrl: string | undefined
    if (draft.imageFile) {
      const result = await uploadImage(draft.imageFile)
      if ('error' in result) {
        setFormError(t('admin.services.imageUploadFailed', { error: result.error }))
        setSaving(false)
        return
      }
      imageUrl = result.url
    }

    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      price_cents: Math.round(Number(draft.price_dollars) * 100),
      category: draft.category.trim() || null,
      points_value: draft.points_value !== '' ? Number(draft.points_value) : null,
      status: draft.status,
      subscription_enabled: draft.subscriptionEnabled,
      subscription_interval: draft.subscriptionEnabled ? draft.subscriptionInterval : null,
      subscription_price_cents: draft.subscriptionEnabled ? Math.round(Number(draft.subscriptionPriceDollars) * 100) : null,
      ...(imageUrl ? { image_url: imageUrl } : {}),
    }

    if (editingId) {
      const { error } = await supabase.from('services').update(payload).eq('id', editingId)
      if (error) { setFormError(error.message); setSaving(false); return }
      setServices(prev => prev.map(s =>
        s.id === editingId
          ? { ...s, ...payload, image_url: imageUrl ?? s.image_url }
          : s,
      ))
      setToastMsg(t('admin.services.serviceUpdated'))
    } else {
      const { data, error } = await supabase
        .from('services')
        .insert({
          ...payload,
          business_id: ownedBusinessId!,
          image_url: imageUrl ?? null,
        })
        .select()
        .single()
      if (error) { setFormError(error.message); setSaving(false); return }
      setServices(prev => [...prev, data as Service])
      setToastMsg(t('admin.services.serviceAdded'))
    }

    setSaving(false)
    setDrawerOpen(false)
  }

  async function toggleStatus(service: Service) {
    const next = STATUS_CYCLE[service.status]
    setServices(prev => prev.map(s => s.id === service.id ? { ...s, status: next } : s))
    await supabase.from('services').update({ status: next }).eq('id', service.id)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('services').delete().eq('id', deleteTarget.id)
    if (error) {
      setToastVariant('error')
      setToastMsg(t('admin.services.deleteFailed'))
    } else {
      setServices(prev => prev.filter(s => s.id !== deleteTarget.id))
      setToastVariant('success')
      setToastMsg(t('admin.services.serviceDeleted'))
      setDrawerOpen(false)
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t('admin.services.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('admin.services.subtitle')}</p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus size={14} />
          {t('admin.services.addTitle')}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              <Skeleton className="w-10 h-10 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="w-8 h-8 rounded" />
            </div>
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground rounded-lg border border-dashed">
          <Wrench size={36} className="opacity-30" />
          <p className="text-sm">{t('admin.services.emptyTitle')}</p>
          <Button size="sm" variant="outline" onClick={openAdd}>
            <Plus size={14} />
            {t('admin.services.addFirst')}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {services.map(s => (
            <ServiceRow
              key={s.id}
              service={s}
              pointsPerDollar={pointsPerDollar}
              onEdit={() => openEdit(s)}
              onStatusToggle={() => toggleStatus(s)}
            />
          ))}
        </div>
      )}

      <ServiceForm
        open={drawerOpen}
        draft={draft}
        pointsPerDollar={pointsPerDollar}
        onChange={patch => setDraft(prev => ({ ...prev, ...patch }))}
        onSave={handleSave}
        onClose={() => setDrawerOpen(false)}
        onDelete={() => {
          const target = services.find(s => s.id === editingId)
          if (target) setDeleteTarget(target)
        }}
        saving={saving}
        error={formError}
        mode={editingId ? 'edit' : 'add'}
      />

      {deleteTarget && (
        <DeleteConfirm
          title={t('admin.services.deleteTitle')}
          message={t('admin.services.deleteConfirmMessage', { name: deleteTarget.name })}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}

      {toastMsg && <Toast message={toastMsg} variant={toastVariant} onDone={() => setToastMsg(null)} />}
    </div>
  )
}
