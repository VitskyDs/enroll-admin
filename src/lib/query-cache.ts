// Tiny in-memory stale-while-revalidate cache shared across the app. Lets the
// data hooks render instantly from a previous fetch (no skeleton flash when
// navigating back to a screen) while they refresh in the background.
const stores = new Map<string, Map<string, unknown>>()

function store(namespace: string) {
  let m = stores.get(namespace)
  if (!m) { m = new Map(); stores.set(namespace, m) }
  return m
}

export function readCache<T>(namespace: string, key: string): { hit: boolean; value: T | undefined } {
  const m = store(namespace)
  return { hit: m.has(key), value: m.get(key) as T | undefined }
}

export function writeCache<T>(namespace: string, key: string, value: T) {
  store(namespace).set(key, value)
}
