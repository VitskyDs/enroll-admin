import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Pencil, Gift, X, Check, Upload, Trash2, TriangleAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useBusiness } from '@/hooks/useBusiness'
import { Drawer } from '@/components/owner/drawer'
import { Input } from '@vitskyds/enroll-ui'
import { Button } from '@vitskyds/enroll-ui'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type RewardStatus = 'active' | 'inactive'

type ProductOption = {
  id: string
  name: string
  image_urls: string[]
}

type Reward = {
  id: string
  name: string
  description: string | null
  points_cost: number
  status: RewardStatus
  image_url: string | null
  product_ids: string[]
  // First linked product's image — used as the display image fallback when
  // no manual image_url is set (TASK-101).
  linked_image_url: string | null
}

// Raw shape of the `load()` query — reward_products is a join table, so its
// nested `products` embed is a to-one relation despite the plural name.
type RewardRow = Omit<Reward, 'product_ids' | 'linked_image_url'> & {
  reward_products: { product_id: string; products: { image_urls: string[] } | null }[]
}

type FormDraft = {
  name: string
  description: string
  points_cost: string
  status: RewardStatus
  imageFile: File | null
  imagePreview: string | null
  productIds: string[]
}

const EMPTY_DRAFT: FormDraft = {
  name: '',
  description: '',
  points_cost: '',
  status: 'active',
  imageFile: null,
  imagePreview: null,
  productIds: [],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />
}

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

// ─── Reward form drawer ───────────────────────────────────────────────────────

function RewardForm({
  open,
  draft,
  onChange,
  onSave,
  onClose,
  saving,
  error,
  mode,
  activeProducts,
}: {
  open: boolean
  draft: FormDraft
  onChange: (patch: Partial<FormDraft>) => void
  onSave: () => void
  onClose: () => void
  saving: boolean
  error: string | null
  mode: 'add' | 'edit'
  activeProducts: ProductOption[]
}) {
  const { t } = useTranslation()
  const { business } = useBusiness()
  const hebrewOnly = business?.default_language === 'he'
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onChange({ imageFile: file, imagePreview: URL.createObjectURL(file) })
  }

  function toggleProduct(productId: string) {
    onChange({
      productIds: draft.productIds.includes(productId)
        ? draft.productIds.filter(id => id !== productId)
        : [...draft.productIds, productId],
    })
  }

  return (
    <Drawer open={open} onClose={onClose} side="right" className="w-full max-w-md border-l flex flex-col">
      <>
        <div className="flex items-center justify-between h-14 border-b px-5 shrink-0">
          <span className="font-semibold text-sm">{mode === 'add' ? t('admin.rewards.addTitle') : t('admin.rewards.editTitle')}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Image */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('admin.rewards.imageLabel')}</label>
            <div
              onClick={() => fileRef.current?.click()}
              className={cn(
                'relative flex items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-colors hover:border-foreground/40',
                draft.imagePreview ? 'border-transparent p-0 overflow-hidden' : 'border-muted-foreground/30 h-32',
              )}
            >
              {draft.imagePreview ? (
                <img src={draft.imagePreview} alt={t('admin.rewards.imageLabel')} className="w-full h-40 object-cover" />
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
            <label className="text-sm font-medium">{t('admin.rewards.nameLabel')} <span className="text-destructive">*</span></label>
            <Input
              {...(hebrewOnly ? { dir: 'rtl', lang: 'he' } : {})}
              value={draft.name}
              onChange={e => onChange({ name: e.target.value })}
              placeholder={t('admin.rewards.namePlaceholder')}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('admin.rewards.descriptionLabel')}</label>
            <textarea
              {...(hebrewOnly ? { dir: 'rtl', lang: 'he' } : {})}
              value={draft.description}
              onChange={e => onChange({ description: e.target.value })}
              placeholder={t('admin.rewards.descriptionPlaceholder')}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Points cost + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('admin.rewards.pointsCostLabel')} <span className="text-destructive">*</span></label>
              <Input
                type="number"
                min="1"
                placeholder={t('admin.rewards.pointsCostPlaceholder')}
                value={draft.points_cost}
                onChange={e => onChange({ points_cost: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('admin.rewards.statusLabel')}</label>
              <select
                value={draft.status}
                onChange={e => onChange({ status: e.target.value as RewardStatus })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              >
                <option value="active">{t('status.active')}</option>
                <option value="inactive">{t('status.inactive')}</option>
              </select>
            </div>
          </div>

          {/* Linked products */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{t('admin.rewards.linkedProductsLabel')}</label>
            <p className="text-xs text-muted-foreground">{t('admin.rewards.linkedProductsHint')}</p>
            {activeProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('admin.rewards.noActiveProducts')}</p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                {activeProducts.map(p => (
                  <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-muted/20">
                    <input
                      type="checkbox"
                      checked={draft.productIds.includes(p.id)}
                      onChange={() => toggleProduct(p.id)}
                      className="h-3.5 w-3.5 rounded border-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    />
                    <span className="flex-1 truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="border-t p-4 shrink-0">
          <Button className="w-full" onClick={onSave} disabled={saving}>
            {saving ? t('common.saving') : mode === 'add' ? t('admin.rewards.addTitle') : t('admin.rewards.saveChanges')}
          </Button>
        </div>
      </>
    </Drawer>
  )
}

// ─── Reward row ───────────────────────────────────────────────────────────────

function RewardRow({
  reward,
  onEdit,
  onStatusToggle,
  onDelete,
}: {
  reward: Reward
  onEdit: () => void
  onStatusToggle: () => void
  onDelete: () => void
}) {
  const { t } = useTranslation()
  const displayImage = reward.image_url ?? reward.linked_image_url
  return (
    <div
      onClick={onEdit}
      className="flex items-center gap-3 rounded-lg border p-3 bg-card cursor-pointer hover:bg-muted/40 transition-colors"
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-md overflow-hidden border shrink-0 bg-muted flex items-center justify-center">
        {displayImage ? (
          <img src={displayImage} alt={reward.name} className="w-full h-full object-cover" />
        ) : (
          <Gift size={16} className="text-muted-foreground/40" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{reward.name}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{t('admin.customers.ptsSuffix', { count: reward.points_cost })}</div>
      </div>

      {/* Status toggle */}
      <button
        onClick={e => { e.stopPropagation(); onStatusToggle() }}
        title={t('admin.rewards.toggleStatusTitle')}
        className={cn(
          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 transition-colors',
          reward.status === 'active'
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400'
            : 'text-zinc-500 bg-zinc-50 border-zinc-200 dark:bg-zinc-800/30 dark:border-zinc-700',
        )}
      >
        {reward.status === 'active' ? t('status.active') : t('status.inactive')}
      </button>

      {/* Edit */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={e => { e.stopPropagation(); onEdit() }}
      >
        <Pencil size={14} />
      </Button>

      {/* Delete */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
        title={t('admin.rewards.deleteButtonTitle')}
        onClick={e => { e.stopPropagation(); onDelete() }}
      >
        <Trash2 size={14} />
      </Button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OwnerRewards() {
  const { t } = useTranslation()
  const { ownedBusinessId } = useAuth()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<FormDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success')
  const [deleteTarget, setDeleteTarget] = useState<Reward | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [activeProducts, setActiveProducts] = useState<ProductOption[]>([])

  const load = useCallback(async () => {
    if (!ownedBusinessId) return
    setLoading(true)
    const { data } = await supabase
      .from('rewards')
      .select('id, name, description, points_cost, status, image_url, reward_products(product_id, products(image_urls))')
      .eq('business_id', ownedBusinessId)
      .order('created_at')
    setRewards(
      ((data ?? []) as unknown as RewardRow[]).map(({ reward_products, ...r }) => ({
        ...r,
        product_ids: reward_products.map(rp => rp.product_id),
        linked_image_url: reward_products[0]?.products?.image_urls[0] ?? null,
      })),
    )
    setLoading(false)
  }, [ownedBusinessId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!ownedBusinessId) return
    supabase
      .from('products')
      .select('id, name, image_urls')
      .eq('business_id', ownedBusinessId)
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => setActiveProducts((data ?? []) as ProductOption[]))
  }, [ownedBusinessId])

  function openAdd() {
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setFormError(null)
    setDrawerOpen(true)
  }

  function openEdit(reward: Reward) {
    setEditingId(reward.id)
    setDraft({
      name: reward.name,
      description: reward.description ?? '',
      points_cost: String(reward.points_cost),
      status: reward.status,
      imageFile: null,
      imagePreview: reward.image_url,
      productIds: reward.product_ids,
    })
    setFormError(null)
    setDrawerOpen(true)
  }

  async function uploadImage(file: File): Promise<{ url: string } | { error: string }> {
    const ext = file.name.split('.').pop()
    const path = `${ownedBusinessId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('reward-images').upload(path, file)
    if (error) return { error: error.message }
    const { data } = supabase.storage.from('reward-images').getPublicUrl(path)
    return { url: data.publicUrl }
  }

  // Replaces a reward's linked-products set wholesale — simpler than diffing
  // and matches this page's existing non-transactional write style. Returns
  // the Supabase error (delete or insert) on failure so the caller can surface
  // it and avoid trusting the draft's productIds as the new source of truth.
  async function syncRewardProducts(rewardId: string, productIds: string[]): Promise<{ error: string } | null> {
    const del = await supabase.from('reward_products').delete().eq('reward_id', rewardId)
    if (del.error) return { error: del.error.message }
    if (productIds.length === 0) return null
    const { error } = await supabase
      .from('reward_products')
      .insert(productIds.map(product_id => ({ reward_id: rewardId, product_id, business_id: ownedBusinessId! })))
    if (error) return { error: error.message }
    return null
  }

  // Ground truth for a reward's linked products, read back from the DB —
  // used after a failed sync since the delete may have succeeded even though
  // the insert didn't, leaving the draft's productIds out of sync with reality.
  async function fetchLinkedProducts(rewardId: string): Promise<{ product_ids: string[]; linked_image_url: string | null }> {
    const { data } = await supabase
      .from('reward_products')
      .select('product_id, products(image_urls)')
      .eq('reward_id', rewardId)
    const rows = (data ?? []) as unknown as { product_id: string; products: { image_urls: string[] } | null }[]
    return {
      product_ids: rows.map(r => r.product_id),
      linked_image_url: rows[0]?.products?.image_urls[0] ?? null,
    }
  }

  function linkedImageFor(productIds: string[]): string | null {
    const first = activeProducts.find(p => p.id === productIds[0])
    return first?.image_urls[0] ?? null
  }

  async function handleSave() {
    setFormError(null)
    if (!draft.name.trim()) { setFormError(t('admin.rewards.nameRequired')); return }
    if (draft.points_cost === '' || Number(draft.points_cost) < 1) {
      setFormError(t('admin.rewards.pointsCostInvalid'))
      return
    }
    setSaving(true)

    let imageUrl: string | undefined
    if (draft.imageFile) {
      const result = await uploadImage(draft.imageFile)
      if ('error' in result) {
        setFormError(t('admin.rewards.imageUploadFailed', { error: result.error }))
        setSaving(false)
        return
      }
      imageUrl = result.url
    }

    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      points_cost: Number(draft.points_cost),
      status: draft.status,
      ...(imageUrl ? { image_url: imageUrl } : {}),
    }

    if (editingId) {
      const { error } = await supabase.from('rewards').update(payload).eq('id', editingId)
      if (error) { setFormError(error.message); setSaving(false); return }
      const syncResult = await syncRewardProducts(editingId, draft.productIds)
      if (syncResult) {
        const actual = await fetchLinkedProducts(editingId)
        setRewards(prev => prev.map(r =>
          r.id === editingId
            ? { ...r, ...payload, image_url: imageUrl ?? r.image_url, product_ids: actual.product_ids, linked_image_url: actual.linked_image_url }
            : r,
        ))
        setFormError(syncResult.error)
        setSaving(false)
        return
      }
      setRewards(prev => prev.map(r =>
        r.id === editingId
          ? { ...r, ...payload, image_url: imageUrl ?? r.image_url, product_ids: draft.productIds, linked_image_url: linkedImageFor(draft.productIds) }
          : r,
      ))
      setToastMsg(t('admin.rewards.rewardUpdated'))
    } else {
      const { data, error } = await supabase
        .from('rewards')
        .insert({ ...payload, business_id: ownedBusinessId!, image_url: imageUrl ?? null })
        .select()
        .single()
      if (error) { setFormError(error.message); setSaving(false); return }
      // The reward row now exists — switch to edit mode so a retry after a
      // sync failure below updates it instead of inserting a duplicate.
      setEditingId(data.id)
      const syncResult = await syncRewardProducts(data.id, draft.productIds)
      if (syncResult) {
        const actual = await fetchLinkedProducts(data.id)
        setRewards(prev => [...prev, { ...(data as Reward), product_ids: actual.product_ids, linked_image_url: actual.linked_image_url }])
        setFormError(syncResult.error)
        setSaving(false)
        return
      }
      setRewards(prev => [...prev, { ...(data as Reward), product_ids: draft.productIds, linked_image_url: linkedImageFor(draft.productIds) }])
      setToastMsg(t('admin.rewards.rewardAdded'))
    }

    setSaving(false)
    setDrawerOpen(false)
  }

  async function toggleStatus(reward: Reward) {
    const next: RewardStatus = reward.status === 'active' ? 'inactive' : 'active'
    setRewards(prev => prev.map(r => r.id === reward.id ? { ...r, status: next } : r))
    await supabase.from('rewards').update({ status: next }).eq('id', reward.id)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.from('rewards').delete().eq('id', deleteTarget.id)
    if (error) {
      setToastVariant('error')
      setToastMsg(t('admin.rewards.deleteFailed'))
    } else {
      setRewards(prev => prev.filter(r => r.id !== deleteTarget.id))
      setToastVariant('success')
      setToastMsg(t('admin.rewards.rewardDeleted'))
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('admin.nav.rewards')}</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus size={14} />
          {t('admin.rewards.addTitle')}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              <Skeleton className="w-10 h-10 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="w-8 h-8 rounded" />
            </div>
          ))}
        </div>
      ) : rewards.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground rounded-lg border border-dashed">
          <Gift size={36} className="opacity-30" />
          <p className="text-sm">{t('admin.rewards.emptyTitle')}</p>
          <Button size="sm" variant="outline" onClick={openAdd}>
            <Plus size={14} />
            {t('admin.rewards.addFirst')}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {rewards.map(r => (
            <RewardRow
              key={r.id}
              reward={r}
              onEdit={() => openEdit(r)}
              onStatusToggle={() => toggleStatus(r)}
              onDelete={() => setDeleteTarget(r)}
            />
          ))}
        </div>
      )}

      <RewardForm
        open={drawerOpen}
        draft={draft}
        onChange={patch => setDraft(prev => ({ ...prev, ...patch }))}
        onSave={handleSave}
        onClose={() => setDrawerOpen(false)}
        saving={saving}
        error={formError}
        mode={editingId ? 'edit' : 'add'}
        activeProducts={activeProducts}
      />

      {deleteTarget && (
        <DeleteConfirm
          title={t('admin.rewards.deleteTitle')}
          message={t('admin.rewards.deleteConfirmMessage', { name: deleteTarget.name })}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}

      {toastMsg && <Toast message={toastMsg} variant={toastVariant} onDone={() => setToastMsg(null)} />}
    </div>
  )
}
