// Email/password sign-in is a testing/preview convenience — enabled in local
// dev, on Vercel preview deployments, or via an explicit env override, but
// never in production (Google OAuth is the only production sign-in method).
export const isEmailAuthEnabled =
  import.meta.env.VITE_ENABLE_EMAIL_AUTH === 'true' ||
  import.meta.env.DEV ||
  (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app'))
