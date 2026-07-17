import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export type OwnerCustomer = {
  id: string
  name: string
  email: string | null
  phone: string | null
  tier: string | null
  points: number
  lifetime_points: number
  last_visit_at: string | null
  joined_at: string | null
  status: string
  punch_card_count: number
  churn_risk_score: number | null
  churn_risk_reason: string | null
}

export function useOwnerCustomers() {
  const { ownedBusinessId } = useAuth()
  const [customers, setCustomers] = useState<OwnerCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ownedBusinessId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('customers')
        .select(
          'id, name, email, phone, tier, points, lifetime_points, last_visit_at, joined_at, status, punch_card_count, churn_risk_score, churn_risk_reason',
        )
        .eq('business_id', ownedBusinessId)
        .order('last_visit_at', { ascending: false, nullsFirst: false })

      if (!cancelled) {
        if (err) setError(err.message)
        else setCustomers(data ?? [])
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [ownedBusinessId])

  return { customers, loading, error }
}
