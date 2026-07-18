import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, Search, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input, Button } from '@vitskyds/enroll-ui'
import { useOwnerActivity, type ActivityRow, type ActivityTypeFilter, type ActivityDateFilter } from '@/hooks/useOwnerActivity'
import { useOwnerCustomers } from '@/hooks/useOwnerCustomers'
import { useAuth } from '@/contexts/AuthContext'
import { NativeSelect } from '@/components/owner/native-select'
import { CustomerDetailPanel, CustomerDetailDrawer, reasonLabel } from '@/components/owner/customer-detail-panel'
import type { TFunction } from 'i18next'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('he-IL', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'
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

function AmountCell({ points }: { points: number }) {
  return (
    <span dir="ltr" className={cn('text-sm font-semibold tabular-nums', points > 0 ? 'text-emerald-600' : 'text-red-500')}>
      {points > 0 ? '+' : ''}{points}
    </span>
  )
}

function ActivityRowDesktop({ t, row, selected, onClick }: { t: TFunction; row: ActivityRow; selected: boolean; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn('border-b cursor-pointer hover:bg-muted/40 transition-colors', selected && 'bg-muted/60')}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={row.customerName} />
          <span className="text-sm font-medium truncate">{row.customerName}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{reasonLabel(t, row.reason)}</td>
      <td className="px-4 py-3"><AmountCell points={row.points} /></td>
      <td className="px-4 py-3 text-sm text-muted-foreground" title={row.created_at}>{formatDateTime(row.created_at)}</td>
    </tr>
  )
}

function ActivityCardMobile({ t, row, selected, onClick }: { t: TFunction; row: ActivityRow; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/40',
        selected && 'bg-muted/60 border-foreground/20',
      )}
    >
      <Avatar name={row.customerName} size={36} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{row.customerName}</span>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span>{reasonLabel(t, row.reason)}</span>
          <span>·</span>
          <AmountCell points={row.points} />
        </div>
        <span className="text-xs text-muted-foreground" title={row.created_at}>{formatDateTime(row.created_at)}</span>
      </div>
    </button>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OwnerActivity() {
  const { t } = useTranslation()
  const { ownedBusinessId } = useAuth()
  const { customers } = useOwnerCustomers()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ActivityTypeFilter>('all')
  const [dateFilter, setDateFilter] = useState<ActivityDateFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const { rows, total, loading, loadingMore, error, hasMore, loadMore, reload } = useOwnerActivity({
    search: debouncedSearch,
    typeFilter,
    dateFilter,
  })

  const filtersActive = debouncedSearch !== '' || typeFilter !== 'all' || dateFilter !== 'all'

  function clearFilters() {
    setSearch('')
    setTypeFilter('all')
    setDateFilter('all')
  }

  const selectedCustomer = useMemo(() => {
    if (!selectedId) return null
    const row = rows.find(r => r.id === selectedId)
    if (!row) return null
    return customers.find(c => c.id === row.customer_id) ?? null
  }, [selectedId, rows, customers])

  return (
    <div className="flex flex-1 h-full min-h-0">
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-6 border-b space-y-3">
          <Link to="/owner/dashboard" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ArrowRight size={14} />
            {t('admin.catchUp.backToDashboard')}
          </Link>

          <div>
            <h1 className="text-xl font-semibold">{t('admin.activity.title')}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t('admin.activity.subtitle')}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={t('admin.activity.searchPlaceholder')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-8"
              />
            </div>
            <NativeSelect value={typeFilter} onChange={v => setTypeFilter(v as ActivityTypeFilter)}>
              <option value="all">{t('admin.activity.allTypes')}</option>
              <option value="earned">{t('admin.activity.typeEarned')}</option>
              <option value="redeemed">{t('admin.activity.typeRedeemed')}</option>
            </NativeSelect>
            <NativeSelect value={dateFilter} onChange={v => setDateFilter(v as ActivityDateFilter)}>
              <option value="all">{t('admin.activity.dateAll')}</option>
              <option value="7d">{t('admin.customers.last7Days')}</option>
              <option value="30d">{t('admin.customers.last30Days')}</option>
              <option value="90d">{t('admin.customers.last90Days')}</option>
            </NativeSelect>
          </div>
        </div>

        {/* List */}
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
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
              <AlertTriangle size={36} className="text-destructive opacity-70" />
              <p className="text-sm">{t('admin.activity.error')}</p>
              <Button variant="outline" size="sm" onClick={reload}>{t('admin.activity.retry')}</Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
              {filtersActive ? (
                <>
                  <Search size={36} className="opacity-30" />
                  <p className="text-sm">{t('admin.activity.emptyFiltered')}</p>
                  <button className="text-xs underline underline-offset-2" onClick={clearFilters}>
                    {t('admin.customers.clearFilters')}
                  </button>
                </>
              ) : (
                <>
                  <Clock size={36} className="opacity-30" />
                  <p className="text-sm max-w-xs text-center">{t('admin.activity.emptyNone')}</p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <table className="hidden md:table w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-2.5 text-right"><span className="text-xs font-medium text-muted-foreground">{t('admin.activity.colCustomer')}</span></th>
                    <th className="px-4 py-2.5 text-right"><span className="text-xs font-medium text-muted-foreground">{t('admin.activity.colType')}</span></th>
                    <th className="px-4 py-2.5 text-right"><span className="text-xs font-medium text-muted-foreground">{t('admin.activity.colAmount')}</span></th>
                    <th className="px-4 py-2.5 text-right"><span className="text-xs font-medium text-muted-foreground">{t('admin.activity.colDate')}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <ActivityRowDesktop
                      key={row.id}
                      t={t}
                      row={row}
                      selected={row.id === selectedId}
                      onClick={() => setSelectedId(id => id === row.id ? null : row.id)}
                    />
                  ))}
                </tbody>
              </table>

              {/* Mobile card list */}
              <div className="md:hidden space-y-2 p-3">
                {rows.map(row => (
                  <ActivityCardMobile
                    key={row.id}
                    t={t}
                    row={row}
                    selected={row.id === selectedId}
                    onClick={() => setSelectedId(id => id === row.id ? null : row.id)}
                  />
                ))}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center p-4">
                  <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? '…' : t('admin.activity.loadMore', { count: total - rows.length })}
                  </Button>
                </div>
              )}

              {/* Result count */}
              <div className="px-4 py-2 text-xs text-muted-foreground border-t">
                {t('admin.activity.resultCount', { count: rows.length, total })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Desktop side panel */}
      <CustomerDetailPanel
        customer={selectedCustomer}
        businessId={ownedBusinessId}
        onClose={() => setSelectedId(null)}
      />

      {/* Mobile bottom drawer */}
      <CustomerDetailDrawer
        customer={selectedCustomer}
        businessId={ownedBusinessId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  )
}
