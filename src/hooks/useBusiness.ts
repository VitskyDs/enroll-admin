import { supabase } from '@/lib/supabase'
import { useCachedQuery } from '@/hooks/useCachedQuery'
import { useAuth } from '@/contexts/AuthContext'
import type { Business } from '@/types'

// Admin has no tenant/multi-business-per-login concept (unlike the consumer
// app, which this hook was copy-pasted from) — the active business is always
// the one the signed-in owner owns.
export function useBusiness() {
  const { ownedBusinessId } = useAuth()

  const { data: business, loading } = useCachedQuery<Business | null>(
    'business',
    ownedBusinessId,
    async () => (await supabase.from('businesses').select('*').eq('id', ownedBusinessId!).single()).data,
    null,
  )

  return { business, loading }
}
