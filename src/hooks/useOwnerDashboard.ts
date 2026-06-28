import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export type DashboardStats = {
  loyaltyStrength: number
  loyaltyStrengthDelta: number | null
  activeMembers: number
  totalMembers: number
  pointsIssuedThisMonth: number
  redemptionsThisMonth: number
  newMembersThisWeek: number
  atRiskCount: number
}

export type RecentActivity = {
  id: string
  customerName: string
  points: number
  reason: string
  createdAt: string
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

function startOfLastMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString()
}

function startOfWeek(d: Date) {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff).toISOString()
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

// Loyalty strength: composite 0–100 score per customer, averaged across active members.
// Signals (weights):
//   40% — visit recency: decays linearly from 100 at day 0 to 0 at day 90
//   30% — redemption engagement: has redeemed at least once → 100, else 0
//   20% — punch card progress: punch_card_count / punch_card_target (capped at 1)
//   10% — referral made: has completed referral → 100, else 0
function computeLoyaltyStrength(
  customers: { id: string; last_visit_at: string | null; punch_card_count: number }[],
  redemptionCustomerIds: Set<string>,
  referralCustomerIds: Set<string>,
  punchTarget: number,
): number {
  if (customers.length === 0) return 0
  const now = Date.now()
  const scores = customers.map(c => {
    const daysSince = c.last_visit_at
      ? Math.max(0, (now - new Date(c.last_visit_at).getTime()) / 86_400_000)
      : 90
    const visitScore = Math.max(0, 1 - daysSince / 90) * 100
    const redeemScore = redemptionCustomerIds.has(c.id) ? 100 : 0
    const punchScore = punchTarget > 0 ? Math.min(1, c.punch_card_count / punchTarget) * 100 : 0
    const referralScore = referralCustomerIds.has(c.id) ? 100 : 0
    return visitScore * 0.4 + redeemScore * 0.3 + punchScore * 0.2 + referralScore * 0.1
  })
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

export function useOwnerDashboard() {
  const { ownedBusinessId } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [businessName, setBusinessName] = useState<string | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  const refresh = useCallback(() => setRefreshToken(t => t + 1), [])

  useEffect(() => {
    if (!ownedBusinessId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const now = new Date()
        const monthStart = startOfMonth(now)
        const lastMonthStart = startOfLastMonth(now)
        const weekStart = startOfWeek(now)
        const ninetyDaysAgo = daysAgo(90)

        const [
          customersRes,
          pointsThisMonthRes,
          pointsLastMonthRes,
          redemptionsThisMonthRes,
          redemptionIdsRes,
          referralIdsRes,
          atRiskRes,
          programRes,
          businessRes,
          recentRes,
        ] = await Promise.all([
          supabase
            .from('customers')
            .select('id, last_visit_at, punch_card_count, joined_at, churn_risk_score')
            .eq('business_id', ownedBusinessId),
          supabase
            .from('point_transactions')
            .select('points')
            .eq('business_id', ownedBusinessId)
            .gte('created_at', monthStart)
            .gt('points', 0),
          supabase
            .from('point_transactions')
            .select('points, customer_id')
            .eq('business_id', ownedBusinessId)
            .gte('created_at', lastMonthStart)
            .lt('created_at', monthStart)
            .gt('points', 0),
          supabase
            .from('point_transactions')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', ownedBusinessId)
            .eq('reason', 'redemption')
            .gte('created_at', monthStart),
          supabase
            .from('point_transactions')
            .select('customer_id')
            .eq('business_id', ownedBusinessId)
            .eq('reason', 'redemption'),
          supabase
            .from('referrals')
            .select('referrer_customer_id')
            .eq('business_id', ownedBusinessId)
            .eq('status', 'completed'),
          supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', ownedBusinessId)
            .gte('churn_risk_score', 0.5),
          supabase
            .from('loyalty_programs')
            .select('punch_card_target')
            .eq('business_id', ownedBusinessId)
            .maybeSingle(),
          supabase
            .from('businesses')
            .select('name')
            .eq('id', ownedBusinessId)
            .maybeSingle(),
          supabase
            .from('point_transactions')
            .select('id, points, reason, created_at, customers(name)')
            .eq('business_id', ownedBusinessId)
            .order('created_at', { ascending: false })
            .limit(6),
        ])

        if (cancelled) return

        const customers = customersRes.data ?? []
        const punchTarget = programRes.data?.punch_card_target ?? 8

        const activeMembers = customers.filter(
          c => c.last_visit_at && c.last_visit_at >= ninetyDaysAgo,
        )
        const totalMembers = customers.length
        const newMembersThisWeek = customers.filter(
          c => c.joined_at && c.joined_at >= weekStart,
        ).length

        const redemptionCustomerIds = new Set(
          (redemptionIdsRes.data ?? []).map(r => r.customer_id),
        )
        const referralCustomerIds = new Set(
          (referralIdsRes.data ?? []).map(r => r.referrer_customer_id),
        )

        const loyaltyStrength = computeLoyaltyStrength(
          activeMembers,
          redemptionCustomerIds,
          referralCustomerIds,
          punchTarget,
        )

        // Last month strength for delta (use same formula over last-month active set)
        const lastMonthActiveIds = new Set(
          (pointsLastMonthRes.data ?? []).map(r => r.customer_id),
        )
        const lastMonthActive = customers.filter(c => lastMonthActiveIds.has(c.id))
        const lastMonthStrength =
          lastMonthActive.length > 0
            ? computeLoyaltyStrength(lastMonthActive, redemptionCustomerIds, referralCustomerIds, punchTarget)
            : null

        const pointsIssuedThisMonth = (pointsThisMonthRes.data ?? []).reduce(
          (sum, r) => sum + r.points,
          0,
        )

        setStats({
          loyaltyStrength,
          loyaltyStrengthDelta: lastMonthStrength !== null ? loyaltyStrength - lastMonthStrength : null,
          activeMembers: activeMembers.length,
          totalMembers,
          pointsIssuedThisMonth,
          redemptionsThisMonth: redemptionsThisMonthRes.count ?? 0,
          newMembersThisWeek,
          atRiskCount: atRiskRes.count ?? 0,
        })

        setBusinessName(businessRes.data?.name ?? null)

        setRecentActivity(
          (recentRes.data ?? []).map(r => {
            // Supabase types the embedded relation as an array; it's a single row here.
            const customer = Array.isArray(r.customers) ? r.customers[0] : r.customers
            return {
              id: r.id,
              customerName: (customer as { name: string } | null)?.name ?? 'Unknown',
              points: r.points,
              reason: r.reason,
              createdAt: r.created_at,
            }
          }),
        )
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [ownedBusinessId, refreshToken])

  return { stats, businessName, recentActivity, loading, error, refresh }
}
