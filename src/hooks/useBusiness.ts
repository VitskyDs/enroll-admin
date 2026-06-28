import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCachedQuery } from '@/hooks/useCachedQuery'
import { useTenant, setLastTenant, DEFAULT_TENANT } from '@/hooks/useTenant'
import type { Business } from '@/types'

// The active business is resolved from the URL tenant slug (`/:tenant/...`).
// Language only changes copy — it no longer switches the active café. On global
// routes (no tenant in the URL) we fall back to the default tenant.
export function useBusiness() {
  const tenant = useTenant()
  const slug = tenant ?? DEFAULT_TENANT

  const { data: business, loading } = useCachedQuery<Business | null>(
    'business',
    slug,
    async () => (await supabase.from('businesses').select('*').eq('slug', slug).single()).data,
    null,
  )

  useEffect(() => {
    if (business) setLastTenant(business.slug)
  }, [business])

  return { business, loading }
}
