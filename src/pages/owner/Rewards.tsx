import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Pencil, Gift, X, Check, Upload } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@vitskyds/enroll-ui'
import { Button } from '@vitskyds/enroll-ui'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type RewardStatus = 'active' | 'inactive'

type Reward = {
  id: string
  name: string
  description: string | null
  points_cost: number
  status: RewardStatus
  image_url: string | null
}

type FormDraft = {
  name: string
  description: string
  points_cost: string
  status: RewardStatus
  imageFile: File | null
  imagePreview: string | null
}

const EMPTY_DRAFT: FormDraft = {
  name: '',
  description: '',
  points_cost: '',
  status: 'active',
  imageFile: null,
  imagePreview: null,
}

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

// ─── Reward form drawer ───────────────────────────────────────────────────────

function RewardForm({
  draft,
  onChange,
  onSave,
  onClose,
  saving,
  error,
  mode,
}: {
  draft: FormDraft
  onChange: (patch: Partial<FormDraft>) => void
  onSave: () => void
  onClose: () => void
  saving: boolean
  error: string | null
  mode: 'add' | 'edit'
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onChange({ imageFile: file, imagePreview: URL.createObjectURL(file) })
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <aside className="relative ml-auto w-full max-w-md bg-background border-l flex flex-col shadow-xl">
        <div className="flex items-center justify-between h-14 border-b px-5 shrink-0">
          <span className="font-semibold text-sm">{mode === 'add' ? 'Add reward' : 'Edit reward'}</span>
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
                <img src={draft.imagePreview} alt="Preview" className="w-full h-40 object-cover" />
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
              placeholder="e.g. Free drip coffee"
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

          {/* Points cost + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Points cost <span className="text-destructive">*</span></label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 50"
                value={draft.points_cost}
                onChange={e => onChange({ points_cost: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <select
                value={draft.status}
                onChange={e => onChange({ status: e.target.value as RewardStatus })}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="border-t p-4 shrink-0">
          <Button className="w-full" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : mode === 'add' ? 'Add reward' : 'Save changes'}
          </Button>
        </div>
      </aside>
    </div>
  )
}

// ─── Reward row ───────────────────────────────────────────────────────────────

function RewardRow({
  reward,
  onEdit,
  onStatusToggle,
}: {
  reward: Reward
  onEdit: () => void
  onStatusToggle: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 bg-card">
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-md overflow-hidden border shrink-0 bg-muted flex items-center justify-center">
        {reward.image_url ? (
          <img src={reward.image_url} alt={reward.name} className="w-full h-full object-cover" />
        ) : (
          <Gift size={16} className="text-muted-foreground/40" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{reward.name}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{reward.points_cost.toLocaleString()} pts</div>
      </div>

      {/* Status toggle */}
      <button
        onClick={onStatusToggle}
        title="Click to toggle status"
        className={cn(
          'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 transition-colors',
          reward.status === 'active'
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400'
            : 'text-zinc-500 bg-zinc-50 border-zinc-200 dark:bg-zinc-800/30 dark:border-zinc-700',
        )}
      >
        {reward.status === 'active' ? 'Active' : 'Inactive'}
      </button>

      {/* Edit */}
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onEdit}>
        <Pencil size={14} />
      </Button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OwnerRewards() {
  const { ownedBusinessId } = useAuth()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<FormDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!ownedBusinessId) return
    setLoading(true)
    const { data } = await supabase
      .from('rewards')
      .select('id, name, description, points_cost, status, image_url')
      .eq('business_id', ownedBusinessId)
      .order('created_at')
    setRewards((data ?? []) as Reward[])
    setLoading(false)
  }, [ownedBusinessId])

  useEffect(() => { load() }, [load])

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

  async function handleSave() {
    setFormError(null)
    if (!draft.name.trim()) { setFormError('Name is required.'); return }
    if (draft.points_cost === '' || Number(draft.points_cost) < 1) {
      setFormError('Points cost must be at least 1.')
      return
    }
    setSaving(true)

    let imageUrl: string | undefined
    if (draft.imageFile) {
      const result = await uploadImage(draft.imageFile)
      if ('error' in result) {
        setFormError(`Image upload failed: ${result.error}`)
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
      setRewards(prev => prev.map(r =>
        r.id === editingId
          ? { ...r, ...payload, image_url: imageUrl ?? r.image_url }
          : r,
      ))
      setToastMsg('Reward updated')
    } else {
      const { data, error } = await supabase
        .from('rewards')
        .insert({ ...payload, business_id: ownedBusinessId!, image_url: imageUrl ?? null })
        .select()
        .single()
      if (error) { setFormError(error.message); setSaving(false); return }
      setRewards(prev => [...prev, data as Reward])
      setToastMsg('Reward added')
    }

    setSaving(false)
    setDrawerOpen(false)
  }

  async function toggleStatus(reward: Reward) {
    const next: RewardStatus = reward.status === 'active' ? 'inactive' : 'active'
    setRewards(prev => prev.map(r => r.id === reward.id ? { ...r, status: next } : r))
    await supabase.from('rewards').update({ status: next }).eq('id', reward.id)
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Rewards</h1>
        <Button size="sm" onClick={openAdd}>
          <Plus size={14} className="mr-1" />
          Add reward
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
          <p className="text-sm">No rewards yet</p>
          <Button size="sm" variant="outline" onClick={openAdd}>
            <Plus size={14} className="mr-1" />
            Add your first reward
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
            />
          ))}
        </div>
      )}

      {drawerOpen && (
        <RewardForm
          draft={draft}
          onChange={patch => setDraft(prev => ({ ...prev, ...patch }))}
          onSave={handleSave}
          onClose={() => setDrawerOpen(false)}
          saving={saving}
          error={formError}
          mode={editingId ? 'edit' : 'add'}
        />
      )}

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}
    </div>
  )
}
