import { useTranslation } from 'react-i18next'

// Generic full-height loading state: a centered spinner. Used as the route
// Suspense fallback (shown during latency between screens) and anywhere a
// screen doesn't have its own loading UI.
export function LoadingScreen() {
  const { t } = useTranslation()
  return (
    <div
      className="flex items-center justify-center min-h-full py-24"
      role="status"
      aria-label={t('common.loading')}
    >
      <div className="size-10 rounded-full border-4 border-muted border-t-primary animate-spin" />
    </div>
  )
}
