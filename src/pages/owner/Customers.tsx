import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X, ChevronUp, ChevronDown, ChevronsUpDown, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@vitskyds/enroll-ui'
import { Button } from '@vitskyds/enroll-ui'
import { useOwnerCustomers, type OwnerCustomer } from '@/hooks/useOwnerCustomers'
import { useAuth } from '@/contexts/AuthContext'
import { CustomerDetailPanel, CustomerDetailDrawer } from '@/components/owner/customer-detail-panel'

// ─── Types ───────────────────────────────────────────────────────────────────

type SortField = 'last_visit_at' | 'points' | 'lifetime_points' | 'joined_at'
type SortDir = 'asc' | 'desc'
type TierFilter = 'all' | 'bronze' | 'silver' | 'gold' | 'none'
type StatusFilter = 'all' | 'active' | 'inactive'
type LastVisitFilter = 'all' | '7d' | '30d' | '90d'

const PAGE_SIZE = 50

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function isActive(c: OwnerCustomer) {
  return !!c.last_visit_at && c.last_visit_at >= daysAgo(90)
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('')
}

function tierLabel(tier: string | null) {
  if (!tier) return null
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()
}

function tierColor(tier: string | null) {
  switch (tier?.toLowerCase()) {
    case 'gold':   return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800'
    case 'silver': return 'text-zinc-500 bg-zinc-50 border-zinc-200 dark:bg-zinc-800/30 dark:border-zinc-700'
    case 'bronze': return 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800'
    default:       return null
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <div
      className="rounded-full bg-muted flex items-center justify-center shrink-0 text-[11px] font-semibold text-muted-foreground select-none"
      style={{ width: size, height: size }}
    >
      {initials(name)}
    </div>
  )
}

function SortButton({
  field,
  label,
  sortField,
  sortDir,
  onSort,
}: {
  field: SortField
  label: string
  sortField: SortField
  sortDir: SortDir
  onSort: (f: SortField) => void
}) {
  const active = sortField === field
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      {active ? (
        sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      ) : (
        <ChevronsUpDown size={12} className="opacity-40" />
      )}
    </button>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground text-xs px-2.5 py-1 font-medium">
      {label}
      <button onClick={onRemove} className="hover:text-foreground transition-colors" aria-label={`Remove ${label} filter`}>
        <X size={11} />
      </button>
    </span>
  )
}

function NativeSelect({
  value,
  onChange,
  children,
  className,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cn(
        'h-9 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'text-foreground',
        className,
      )}
    >
      {children}
    </select>
  )
}

// ─── Customer row (desktop table) ─────────────────────────────────────────────

function CustomerRow({
  customer,
  selected,
  onClick,
}: {
  customer: OwnerCustomer
  selected: boolean
  onClick: () => void
}) {
  const tierCls = tierColor(customer.tier)
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b cursor-pointer hover:bg-muted/40 transition-colors',
        selected && 'bg-muted/60',
      )}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={customer.name} />
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{customer.name}</div>
            {customer.email && <div className="text-xs text-muted-foreground truncate">{customer.email}</div>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {customer.tier && tierCls ? (
          <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', tierCls)}>
            {tierLabel(customer.tier)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums">{customer.points.toLocaleString()}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(customer.last_visit_at)}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(customer.joined_at)}</td>
    </tr>
  )
}

// ─── Customer card (mobile list) ──────────────────────────────────────────────

function CustomerCard({
  customer,
  selected,
  onClick,
}: {
  customer: OwnerCustomer
  selected: boolean
  onClick: () => void
}) {
  const tierCls = tierColor(customer.tier)
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/40',
        selected && 'bg-muted/60 border-foreground/20',
      )}
    >
      <Avatar name={customer.name} size={36} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{customer.name}</span>
          {customer.tier && tierCls && (
            <span className={cn('inline-flex items-center rounded-full border px-1.5 py-0.5 text-[11px] font-medium', tierCls)}>
              {tierLabel(customer.tier)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span>{customer.points.toLocaleString()} pts</span>
          <span>·</span>
          <span>Last visit {formatDate(customer.last_visit_at)}</span>
        </div>
      </div>
    </button>
  )
}

// (CustomerDetailPanel and CustomerDetailDrawer are imported from @/components/owner/customer-detail-panel)

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OwnerCustomers() {
  const { customers, loading } = useOwnerCustomers()
  const { ownedBusinessId } = useAuth()

  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [lastVisitFilter, setLastVisitFilter] = useState<LastVisitFilter>('all')
  const [sortField, setSortField] = useState<SortField>('last_visit_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [debouncedSearch, tierFilter, statusFilter, lastVisitFilter, sortField, sortDir])

  const handleSort = useCallback((field: SortField) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        return field
      }
      setSortDir('desc')
      return field
    })
  }, [])

  const filtered = useMemo(() => {
    let list = customers

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)),
      )
    }

    if (tierFilter !== 'all') {
      list = list.filter(c => {
        if (tierFilter === 'none') return !c.tier
        return c.tier?.toLowerCase() === tierFilter
      })
    }

    if (statusFilter !== 'all') {
      list = list.filter(c => statusFilter === 'active' ? isActive(c) : !isActive(c))
    }

    if (lastVisitFilter !== 'all') {
      const days = lastVisitFilter === '7d' ? 7 : lastVisitFilter === '30d' ? 30 : 90
      const cutoff = daysAgo(days)
      list = list.filter(c => c.last_visit_at && c.last_visit_at >= cutoff)
    }

    return [...list].sort((a, b) => {
      let av: number, bv: number
      switch (sortField) {
        case 'last_visit_at':
          av = a.last_visit_at ? new Date(a.last_visit_at).getTime() : 0
          bv = b.last_visit_at ? new Date(b.last_visit_at).getTime() : 0
          break
        case 'points':
          av = a.points; bv = b.points; break
        case 'lifetime_points':
          av = a.lifetime_points; bv = b.lifetime_points; break
        case 'joined_at':
          av = a.joined_at ? new Date(a.joined_at).getTime() : 0
          bv = b.joined_at ? new Date(b.joined_at).getTime() : 0
          break
      }
      return sortDir === 'asc' ? av - bv : bv - av
    })
  }, [customers, debouncedSearch, tierFilter, statusFilter, lastVisitFilter, sortField, sortDir])

  const paginated = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = paginated.length < filtered.length

  const activeChips: { label: string; clear: () => void }[] = []
  if (tierFilter !== 'all') activeChips.push({ label: `Tier: ${tierFilter === 'none' ? 'None' : tierFilter.charAt(0).toUpperCase() + tierFilter.slice(1)}`, clear: () => setTierFilter('all') })
  if (statusFilter !== 'all') activeChips.push({ label: `Status: ${statusFilter}`, clear: () => setStatusFilter('all') })
  if (lastVisitFilter !== 'all') activeChips.push({ label: `Last visit: ${lastVisitFilter === '7d' ? '7 days' : lastVisitFilter === '30d' ? '30 days' : '90 days'}`, clear: () => setLastVisitFilter('all') })

  return (
    <div className="flex flex-1 h-full min-h-0">
      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-6 border-b space-y-3">
          <h1 className="text-xl font-semibold">Customers</h1>

          {/* Search + filters row */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name or email"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <NativeSelect value={tierFilter} onChange={v => setTierFilter(v as TierFilter)}>
              <option value="all">All tiers</option>
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="bronze">Bronze</option>
              <option value="none">No tier</option>
            </NativeSelect>
            <NativeSelect value={statusFilter} onChange={v => setStatusFilter(v as StatusFilter)}>
              <option value="all">All statuses</option>
              <option value="active">Active (90d)</option>
              <option value="inactive">Inactive</option>
            </NativeSelect>
            <NativeSelect value={lastVisitFilter} onChange={v => setLastVisitFilter(v as LastVisitFilter)}>
              <option value="all">Any last visit</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </NativeSelect>
          </div>

          {/* Active filter chips */}
          {activeChips.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              {activeChips.map(chip => (
                <FilterChip key={chip.label} label={chip.label} onRemove={chip.clear} />
              ))}
              <button
                onClick={() => { setTierFilter('all'); setStatusFilter('all'); setLastVisitFilter('all') }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Table / list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-1 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-3.5 w-12" />
                  <Skeleton className="h-3.5 w-24 hidden md:block" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
              <Users size={36} className="opacity-30" />
              <p className="text-sm">
                {customers.length === 0 ? 'No customers enrolled yet' : 'No customers match your filters'}
              </p>
              {customers.length > 0 && activeChips.length > 0 && (
                <button
                  className="text-xs underline underline-offset-2"
                  onClick={() => { setTierFilter('all'); setStatusFilter('all'); setLastVisitFilter('all'); setSearch('') }}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <table className="hidden md:table w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-2.5 text-left">
                      <span className="text-xs font-medium text-muted-foreground">Name</span>
                    </th>
                    <th className="px-4 py-2.5 text-left">
                      <span className="text-xs font-medium text-muted-foreground">Tier</span>
                    </th>
                    <th className="px-4 py-2.5 text-left">
                      <SortButton field="points" label="Points" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="px-4 py-2.5 text-left">
                      <SortButton field="last_visit_at" label="Last visit" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    </th>
                    <th className="px-4 py-2.5 text-left">
                      <SortButton field="joined_at" label="Joined" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(c => (
                    <CustomerRow
                      key={c.id}
                      customer={c}
                      selected={c.id === selectedId}
                      onClick={() => setSelectedId(id => id === c.id ? null : c.id)}
                    />
                  ))}
                </tbody>
              </table>

              {/* Mobile card list */}
              <div className="md:hidden space-y-2 p-3">
                {paginated.map(c => (
                  <CustomerCard
                    key={c.id}
                    customer={c}
                    selected={c.id === selectedId}
                    onClick={() => setSelectedId(id => id === c.id ? null : c.id)}
                  />
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center p-4">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)}>
                    Show more ({filtered.length - paginated.length} remaining)
                  </Button>
                </div>
              )}

              {/* Result count */}
              <div className="px-4 py-2 text-xs text-muted-foreground border-t">
                {filtered.length} {filtered.length === 1 ? 'customer' : 'customers'}
                {filtered.length !== customers.length && ` of ${customers.length} total`}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Desktop side panel */}
      <CustomerDetailPanel
        customer={selectedId ? (customers.find(c => c.id === selectedId) ?? null) : null}
        businessId={ownedBusinessId}
        onClose={() => setSelectedId(null)}
      />

      {/* Mobile bottom drawer */}
      <CustomerDetailDrawer
        customer={selectedId ? (customers.find(c => c.id === selectedId) ?? null) : null}
        businessId={ownedBusinessId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  )
}
