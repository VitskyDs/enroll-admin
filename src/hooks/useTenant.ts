import { useCallback } from 'react'
import { useLocation, useNavigate, type NavigateOptions } from 'react-router-dom'

// The consumer app is multi-tenant: the active business is the first path
// segment (`/:tenant/...`). A few routes live at the app root instead of under a
// tenant — those segments are never treated as a tenant slug.
const NON_TENANT_SEGMENTS = new Set(['auth', 'join', 'owner'])

const LAST_TENANT_KEY = 'lastTenant'
export const DEFAULT_TENANT = 'corner-cup'

/** Active tenant slug from a pathname, or null on a global (non-tenant) route. */
export function tenantFromPath(pathname: string): string | null {
  const seg = pathname.split('/').filter(Boolean)[0]
  if (!seg || NON_TENANT_SEGMENTS.has(seg)) return null
  return seg
}

/** The path relative to the active tenant prefix (e.g. `/corner-cup/points` → `/points`). */
export function subPath(pathname: string, tenant: string | null): string {
  if (tenant && pathname.startsWith(`/${tenant}`)) {
    return pathname.slice(tenant.length + 1) || '/'
  }
  return pathname
}

/** Prefix an absolute consumer path with the tenant. Owner/auth paths pass through. */
export function tenantHref(tenant: string | null, path: string): string {
  if (!tenant || !path.startsWith('/')) return path
  if (path.startsWith('/owner') || path.startsWith('/auth')) return path
  return path === '/' ? `/${tenant}` : `/${tenant}${path}`
}

export function getLastTenant(): string {
  if (typeof window === 'undefined') return DEFAULT_TENANT
  return localStorage.getItem(LAST_TENANT_KEY) ?? DEFAULT_TENANT
}

export function setLastTenant(slug: string): void {
  localStorage.setItem(LAST_TENANT_KEY, slug)
}

// The OAuth round-trip leaves the app and returns to the global `/auth/callback`,
// so we stash the active tenant before redirecting and read it back afterwards.
const AUTH_TENANT_KEY = 'authTenant'

export function rememberAuthTenant(tenant: string | null): void {
  if (tenant) sessionStorage.setItem(AUTH_TENANT_KEY, tenant)
}

export function takeAuthTenant(): string | null {
  const tenant = sessionStorage.getItem(AUTH_TENANT_KEY)
  if (tenant) sessionStorage.removeItem(AUTH_TENANT_KEY)
  return tenant
}

/** The active tenant slug, read from the URL. Null on global routes. */
export function useTenant(): string | null {
  const { pathname } = useLocation()
  return tenantFromPath(pathname)
}

/** The current path relative to the active tenant prefix. */
export function useSubPath(): string {
  const { pathname } = useLocation()
  return subPath(pathname, tenantFromPath(pathname))
}

/** navigate() that preserves the active tenant prefix. Numeric deltas pass through. */
export function useTenantNavigate() {
  const navigate = useNavigate()
  const tenant = useTenant()
  return useCallback(
    (to: string | number, options?: NavigateOptions) => {
      if (typeof to === 'number') return navigate(to)
      return navigate(tenantHref(tenant, to), options)
    },
    [navigate, tenant],
  )
}
