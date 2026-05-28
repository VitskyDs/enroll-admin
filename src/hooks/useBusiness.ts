import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Business } from '@/types'

const SLUG = import.meta.env.VITE_BUSINESS_SLUG as string | undefined

const DEV_BUSINESS: Business | null = import.meta.env.DEV
  ? {
      id: 'dev', name: 'Corner Cup', slug: 'corner-cup',
      logo_url: null, cover_image_url: null, tagline: null,
      address: null, hours: null, industry: null, brand_color: '#10b981',
    }
  : null

export function useBusiness() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!SLUG) {
      setBusiness(DEV_BUSINESS)
      setLoading(false)
      return
    }
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
