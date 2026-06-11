import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { demoSlugForLang, DEMO_SLUG_HE } from '@/lib/demo'
import { useCachedQuery } from '@/hooks/useCachedQuery'
import type { Business } from '@/types'

// When VITE_BUSINESS_SLUG is explicitly configured, use it for all languages
// except Hebrew, which always maps to the Hebrew demo business.
const SLUG = import.meta.env.VITE_BUSINESS_SLUG as string | undefined

export function useBusiness() {
  const { i18n } = useTranslation()
  const slug = i18n.language === 'he' ? DEMO_SLUG_HE : (SLUG ?? demoSlugForLang(i18n.language))

  const { data: business, loading } = useCachedQuery<Business | null>(
    'business',
    slug,
    async () => (await supabase.from('businesses').select('*').eq('slug', slug).single()).data,
    null,
  )

  return { business, loading }
}
