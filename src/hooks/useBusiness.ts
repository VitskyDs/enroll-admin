import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { demoSlugForLang, DEMO_SLUG_HE } from '@/lib/demo'
import type { Business } from '@/types'

// When VITE_BUSINESS_SLUG is explicitly configured, use it for all languages
// except Hebrew, which always maps to the Hebrew demo business.
const SLUG = import.meta.env.VITE_BUSINESS_SLUG as string | undefined

export function useBusiness() {
  const { i18n } = useTranslation()
  const slug = i18n.language === 'he' ? DEMO_SLUG_HE : (SLUG ?? demoSlugForLang(i18n.language))

  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setBusiness(null)
    supabase
      .from('businesses')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data }) => {
        setBusiness(data)
        setLoading(false)
      })
  }, [slug])

  return { business, loading }
}
