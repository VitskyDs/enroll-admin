import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export type ActivityTypeFilter = 'all' | 'earned' | 'redeemed'
export type ActivityDateFilter = 'all' | '7d' | '30d' | '90d'

export type ActivityRow = {
  id: string
  customer_id: string
  customerName: string
  points: number
  reason: string
  created_at: string
}

const PAGE_SIZE = 50

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

type CustomerEmbed = { name: string } | { name: string }[] | null

export function useOwnerActivity(params: {
  search: string
  typeFilter: ActivityTypeFilter
  dateFilter: ActivityDateFilter
}) {
  const { ownedBusinessId } = useAuth()
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cursorRef = useRef(0)
  const reqIdRef = useRef(0)

  const load = useCallback(async (reset: boolean) => {
    if (!ownedBusinessId) return
    const from = reset ? 0 : cursorRef.current
    const to = from + PAGE_SIZE - 1
    const reqId = ++reqIdRef.current

    if (reset) { setLoading(true); setError(null) } else { setLoadingMore(true) }

    let query = supabase
      .from('point_transactions')
      .select('id, points, reason, created_at, customer_id, customers!inner(name)', { count: 'exact' })
      .eq('business_id', ownedBusinessId)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (params.search) query = query.ilike('customers.name', `%${params.search}%`)
    if (params.typeFilter === 'earned') query = query.gt('points', 0)
    if (params.typeFilter === 'redeemed') query = query.lt('points', 0)
    if (params.dateFilter !== 'all') {
      const days = params.dateFilter === '7d' ? 7 : params.dateFilter === '30d' ? 30 : 90
      query = query.gte('created_at', daysAgo(days))
    }

    const { data, error: err, count } = await query
    if (reqId !== reqIdRef.current) return // a newer request has superseded this one

    if (err) {
      setError(err.message)
    } else {
      const mapped: ActivityRow[] = (data ?? []).map(r => {
        const customer = Array.isArray(r.customers) ? r.customers[0] : (r.customers as CustomerEmbed)
        return {
          id: r.id,
          customer_id: r.customer_id,
          customerName: (customer as { name: string } | null)?.name ?? '—',
          points: r.points,
          reason: r.reason,
          created_at: r.created_at,
        }
      })
      setRows(prev => reset ? mapped : [...prev, ...mapped])
      setTotal(count ?? 0)
      cursorRef.current = to + 1
    }

    setLoading(false)
    setLoadingMore(false)
  }, [ownedBusinessId, params.search, params.typeFilter, params.dateFilter])

  useEffect(() => { load(true) }, [ownedBusinessId, params.search, params.typeFilter, params.dateFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => load(false), [load])
  const reload = useCallback(() => load(true), [load])

  const hasMore = rows.length < total

  return { rows, total, loading, loadingMore, error, hasMore, loadMore, reload }
}
