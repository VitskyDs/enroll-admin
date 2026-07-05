import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, GripVertical, Pencil, Package, X, Check, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useLoyaltyProgram } from '@/hooks/useLoyaltyProgram'
import type { EarnRules } from '@/types'
import { Input } from '@vitskyds/enroll-ui'
import { Button } from '@vitskyds/enroll-ui'
import { cn } from '@/lib/utils'
import { Drawer } from '@/components/owner/drawer'

// ─── Types ───────────────────────────────────────────────────────────────────

type ProductStatus = 'active' | 'draft' | 'inactive'

// Points a product earns by default, derived from its price and the program's
// points-per-dollar earn rule. Returns null when no rate is configured.
function derivePoints(priceDollars: number, pointsPerDollar: number | null): number | null {
  if (pointsPerDollar == null || !isFinite(priceDollars)) return null
  return Math.round(priceDollars * pointsPerDollar)
}

type Product = {
  id: string
  name: string
  description: string | null
  name_he: string | null
  description_he: string | null
  price_cents: number
  category: string | null
  status: ProductStatus
  sort_order: number
  image_urls: string[]
  points_override: number | null
  kind: string
}

type FormDraft = {
  name: string
  description: string
  name_he: string
  description_he: string
  price_dollars: string
  category: string
  points_override: string
  status: ProductStatus
  imageFile: File | null
  imagePreview: string | null
}

const EMPTY_DRAFT: FormDraft = {
  name: '',
  description: '',
  name_he: '',
  description_he: '',
  price_dollars: '',
  category: '',
  points_override: '',
  status: 'active',
  imageFile: null,
  imagePreview: null,
}

const STATUS_CYCLE: Record<ProductStatus, ProductStatus> = {
  active: 'inactive',
  inactive: 'draft',
  draft: 'active',
}

const STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'Active',
  draft: 'Draft',
  inactive: 'Inactive',
}

const STATUS_COLORS: Record<ProductStatus, string> = {
  active: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400',
  draft: 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800 dark:text-yellow-400',
  inactive: 'text-zinc-500 bg-zinc-50 border-zinc-200 dark:bg-zinc-800/30 dark:border-zinc-700',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function priceFmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />
}

// ─── Toast ───────────────────────────────────────────────────────────────────

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

// ─── Product form drawer ──────────────────────────────────────────────────────

function ProductForm({
  open,
  draft,
  pointsPerDollar,
  onChange,
  onSave,
  onClose,
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
  saving: boolean
  error: string | null
  mode: 'add' | 'edit'
}) {
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
          <span className="font-semibold text-sm">{mode === 'add' ? 'Add product' : 'Edit product'}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X size={16} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Image */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Image</label>
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
                  alt="Preview"
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload size={20} />
                  <span className="text-xs">Click to upload</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Name <span className="text-destructive">*</span></label>
            <Input
              value={draft.name}
              onChange={e => onChange({ name: e.target.value })}
              placeholder="e.g. Drip coffee"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={draft.description}
              onChange={e => onChange({ description: e.target.value })}
              placeholder="Optional description"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Hebrew name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Hebrew name</label>
            <Input
              dir="rtl"
              lang="he"
              value={draft.name_he}
              onChange={e => onChange({ name_he: e.target.value })}
              placeholder="שם בעברית (אופציונלי)"
            />
          </div>

          {/* Hebrew description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Hebrew description</label>
            <textarea
              dir="rtl"
              lang="he"
              value={draft.description_he}
              onChange={e => onChange({ description_he: e.target.value })}
              placeholder="תיאור בעברית (אופציונלי)"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Price + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Price ($) <span className="text-destructive">*</span></label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={draft.price_dollars}
                onChange={e => onChange({ price_dollars: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <Input
                value={draft.category}
                onChange={e => onChange({ category: e.target.value })}
                placeholder="e.g. Drinks"
              />
            </div>
          </div>

          {/* Points override + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Points earned</label>
              <Input
                type="number"
                min="0"
                placeholder={derivedPoints != null ? String(derivedPoints) : 'Default'}
                value={draft.points_override}
                onChange={e => onChange({ points_override: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {derivedPoints != null
                  ? 'Defaults from price.'
                  : 'Set a points-per-dollar rate in Program.'}
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <select
                value={draft.status}
                onChange={e => onChange({ status: e.target.value as ProductStatus })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="border-t p-4 shrink-0">
          <Button className="w-full" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : mode === 'add' ? 'Add product' : 'Save changes'}
          </Button>
        </div>
      </>
    </Drawer>
  )
}

// ─── Product row ──────────────────────────────────────────────────────────────

function ProductRow({
  product,
  pointsPerDollar,
  onEdit,
  onStatusToggle,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
}: {
  product: Product
  pointsPerDollar: number | null
  onEdit: () => void
  onStatusToggle: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  isDragging: boolean
}) {
  const thumb = product.image_urls[0]
  const points = product.points_override ?? derivePoints(product.price_cents / 100, pointsPerDollar)
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 bg-card transition-all',
        isDragging && 'opacity-40 scale-[0.98]',
      )}
    >
      <div className="cursor-grab active:cursor-grabbing text-muted-foreground shrink-0 touch-none">
        <GripVertical size={16} />
      </div>

      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-md overflow-hidden border shrink-0 bg-muted flex items-center justify-center">
        {thumb ? (
          <img src={thumb} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <Package size={16} className="text-muted-foreground/40" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{product.name}</span>
          {product.category && (
            <span className="text-xs text-muted-foreground">{product.category}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span>{priceFmt(product.price_cents)}</span>
          {points != null && (
            <>
              <span>·</span>
              <span>
                {points} pts{product.points_override != null && ' · custom'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Status toggle */}
      <button
        onClick={onStatusToggle}
        title="Click to cycle status"
        className={cn(
          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 transition-colors',
          STATUS_COLORS[product.status],
        )}
      >
        {STATUS_LABELS[product.status]}
      </button>

      {/* Edit */}
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onEdit}>
        <Pencil size={14} />
      </Button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OwnerProducts() {
  const { ownedBusinessId } = useAuth()
  const { program } = useLoyaltyProgram(ownedBusinessId)
  const pointsPerDollar = (program?.earn_rules as EarnRules | undefined)?.points_per_dollar ?? null
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<FormDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const dragIndex = useRef<number | null>(null)

  const load = useCallback(async () => {
    if (!ownedBusinessId) return
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('id, name, description, name_he, description_he, price_cents, category, status, sort_order, image_urls, points_override, kind')
      .eq('business_id', ownedBusinessId)
      .order('sort_order')
    setProducts((data ?? []) as Product[])
    setLoading(false)
  }, [ownedBusinessId])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setFormError(null)
    setDrawerOpen(true)
  }

  function openEdit(product: Product) {
    setEditingId(product.id)
    setDraft({
      name: product.name,
      description: product.description ?? '',
      name_he: product.name_he ?? '',
      description_he: product.description_he ?? '',
      price_dollars: (product.price_cents / 100).toFixed(2),
      category: product.category ?? '',
      points_override: product.points_override != null ? String(product.points_override) : '',
      status: product.status,
      imageFile: null,
      imagePreview: product.image_urls[0] ?? null,
    })
    setFormError(null)
    setDrawerOpen(true)
  }

  async function uploadImage(file: File): Promise<{ url: string } | { error: string }> {
    const ext = file.name.split('.').pop()
    const path = `${ownedBusinessId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file)
    if (error) return { error: error.message }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    return { url: data.publicUrl }
  }

  async function handleSave() {
    setFormError(null)
    if (!draft.name.trim()) { setFormError('Name is required.'); return }
    if (draft.price_dollars === '' || isNaN(Number(draft.price_dollars))) {
      setFormError('Price is required.')
      return
    }
    setSaving(true)

    let imageUrls: string[] | undefined
    if (draft.imageFile) {
      const result = await uploadImage(draft.imageFile)
      if ('error' in result) {
        setFormError(`Image upload failed: ${result.error}`)
        setSaving(false)
        return
      }
      imageUrls = [result.url]
    }

    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      name_he: draft.name_he.trim() || null,
      description_he: draft.description_he.trim() || null,
      price_cents: Math.round(Number(draft.price_dollars) * 100),
      category: draft.category.trim() || null,
      points_override: draft.points_override !== '' ? Number(draft.points_override) : null,
      status: draft.status,
      ...(imageUrls ? { image_urls: imageUrls } : {}),
    }

    if (editingId) {
      const { error } = await supabase.from('products').update(payload).eq('id', editingId)
      if (error) { setFormError(error.message); setSaving(false); return }
      setProducts(prev => prev.map(p =>
        p.id === editingId
          ? { ...p, ...payload, image_urls: imageUrls ?? p.image_urls }
          : p,
      ))
      setToastMsg('Product updated')
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...payload,
          business_id: ownedBusinessId!,
          kind: 'physical',
          sort_order: products.length,
          image_urls: imageUrls ?? [],
          tags: [],
        })
        .select()
        .single()
      if (error) { setFormError(error.message); setSaving(false); return }
      setProducts(prev => [...prev, data as Product])
      setToastMsg('Product added')
    }

    setSaving(false)
    setDrawerOpen(false)
  }

  async function toggleStatus(product: Product) {
    const next = STATUS_CYCLE[product.status]
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status: next } : p))
    await supabase.from('products').update({ status: next }).eq('id', product.id)
  }

  // ── Drag-to-reorder ────────────────────────────────────────────────────────

  function handleDragStart(i: number) {
    dragIndex.current = i
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    const from = dragIndex.current
    if (from === null || from === i) return
    setProducts(prev => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(i, 0, item)
      dragIndex.current = i
      return next
    })
  }

  async function handleDrop() {
    dragIndex.current = null
    // Persist new order
    await Promise.all(
      products.map((p, i) =>
        supabase.from('products').update({ sort_order: i }).eq('id', p.id),
      ),
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Products</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus size={14} className="mr-1" />
          Add product
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              <Skeleton className="w-4 h-4" />
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
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground rounded-lg border border-dashed">
          <Package size={36} className="opacity-30" />
          <p className="text-sm">No products yet</p>
          <Button size="sm" variant="outline" onClick={openAdd}>
            <Plus size={14} className="mr-1" />
            Add your first product
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p, i) => (
            <ProductRow
              key={p.id}
              product={p}
              pointsPerDollar={pointsPerDollar}
              onEdit={() => openEdit(p)}
              onStatusToggle={() => toggleStatus(p)}
              onDragStart={() => handleDragStart(i)}
              onDragOver={e => handleDragOver(e, i)}
              onDrop={handleDrop}
              isDragging={dragIndex.current === i}
            />
          ))}
        </div>
      )}

      <ProductForm
        open={drawerOpen}
        draft={draft}
        pointsPerDollar={pointsPerDollar}
        onChange={patch => setDraft(prev => ({ ...prev, ...patch }))}
        onSave={handleSave}
        onClose={() => setDrawerOpen(false)}
        saving={saving}
        error={formError}
        mode={editingId ? 'edit' : 'add'}
      />

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </div>
  )
}
