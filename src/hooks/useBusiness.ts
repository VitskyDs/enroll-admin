import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Business } from '@/types'

const SLUG = import.meta.env.VITE_BUSINESS_SLUG as string | undefined

export function useBusiness() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!SLUG) { setLoading(false); return }
    supabase
      .from('businesses')
      .select('*')
      .eq('slug', SLUG)
      .single()
      .then(({ data }) => {
        setBusiness(data)
        setLoading(false)
      })
  }, [])

  return { business, loading }
}
