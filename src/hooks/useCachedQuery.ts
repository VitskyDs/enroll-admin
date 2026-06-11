import { useEffect, useState } from 'react'
import { readCache, writeCache } from '@/lib/query-cache'

// Stale-while-revalidate read hook: seeds from cache for an instant render, then
// refetches in the background. `key` null means "nothing to fetch yet".
export function useCachedQuery<T>(
  namespace: string,
  key: string | null,
  fetcher: () => Promise<T>,
  empty: T,
): { data: T; loading: boolean } {
  const seed = key ? readCache<T>(namespace, key) : { hit: false, value: undefined }
  const [data, setData] = useState<T>(seed.hit ? (seed.value as T) : empty)
  const [loading, setLoading] = useState<boolean>(key ? !seed.hit : false)

  useEffect(() => {
    if (!key) { setData(empty); setLoading(false); return }
    const cached = readCache<T>(namespace, key)
    if (cached.hit) { setData(cached.value as T); setLoading(false) }
    else { setLoading(true) }

    let cancelled = false
    fetcher().then(result => {
      if (cancelled) return
      writeCache(namespace, key, result)
      setData(result)
      setLoading(false)
    })
    return () => { cancelled = true }
    // fetcher is recreated each render; key is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace, key])

  return { data, loading }
}
