import { supabase } from '@/lib/supabase'
import { useCachedQuery } from '@/hooks/useCachedQuery'
import type { LoyaltyProgram } from '@/types'

export function useLoyaltyProgram(businessId: string | null | undefined) {
  const { data: program, loading } = useCachedQuery<LoyaltyProgram | null>(
    'loyaltyProgram',
    businessId ?? null,
    async () =>
      (await supabase.from('loyalty_programs').select('*').eq('business_id', businessId!).single()).data,
    null,
  )

  return { program, loading }
}
