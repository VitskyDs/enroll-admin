import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { LoyaltyProgram } from '@/types'

export function useLoyaltyProgram(businessId: string | null | undefined) {
  const [program, setProgram] = useState<LoyaltyProgram | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!businessId) { setLoading(false); return }
    supabase
      .from('loyalty_programs')
      .select('*')
      .eq('business_id', businessId)
      .single()
      .then(({ data }) => {
        setProgram(data)
        setLoading(false)
      })
  }, [businessId])

  return { program, loading }
}
