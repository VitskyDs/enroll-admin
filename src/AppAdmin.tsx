import { lazy, Suspense, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { OwnerLayout } from '@/components/owner-layout'
import { LoadingScreen } from '@/components/loading-screen'
import { Button } from '@vitskyds/enroll-ui'

const SignIn = lazy(() => import('@/pages/SignIn'))
const AuthCallback = lazy(() => import('@/pages/AuthCallback'))
const OwnerOnboarding = lazy(() => import('@/pages/owner/Onboarding'))
const OwnerDashboard = lazy(() => import('@/pages/owner/Dashboard'))
const OwnerActivity = lazy(() => import('@/pages/owner/Activity'))
const OwnerCustomers = lazy(() => import('@/pages/owner/Customers'))
const OwnerProducts = lazy(() => import('@/pages/owner/Products'))
const OwnerServices = lazy(() => import('@/pages/owner/Services'))
const OwnerRewards = lazy(() => import('@/pages/owner/Rewards'))
const OwnerProgram = lazy(() => import('@/pages/owner/Program'))
const OwnerSettings = lazy(() => import('@/pages/owner/Settings'))
const OwnerCatchUp = lazy(() => import('@/pages/owner/CatchUp'))

// Shown for an authenticated user who isn't an owner of any business — without
// this, RequireOwner sends them to /sign-in, which (seeing a logged-in user)
// sends them straight back to /owner, looping forever.
function NotOwnerAccess() {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-screen px-8 text-center">
      <p className="text-lg font-semibold">{t('admin.notOwner.title')}</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        {t('admin.notOwner.desc')}
      </p>
      <div className="flex flex-col gap-2 w-full max-w-64">
        <Button onClick={() => navigate('/owner/onboarding')}>{t('admin.notOwner.createBusiness')}</Button>
        <Button variant="outline" onClick={signOut}>{t('common.signOut')}</Button>
      </div>
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user) return <Navigate to="/sign-in" replace />
  return <>{children}</>
}

function RequireOwner({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isOwner, isOwnerLoading } = useAuth()
  if (isLoading || isOwnerLoading) return null
  if (!user) return <Navigate to="/sign-in" replace />
  if (!isOwner) return <Navigate to="/sign-in" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user, isLoading, isOwner, isOwnerLoading } = useAuth()

  useEffect(() => {
    document.documentElement.style.setProperty('--brand', 'oklch(0.145 0 0)')
  }, [])

  // Only redirect to /owner once we know the user IS an owner — redirecting on
  // `user` alone would send an authenticated non-owner back to /owner, which
  // RequireOwner immediately bounces back here, looping forever.
  let signInElement
  if (isLoading || isOwnerLoading) signInElement = null
  else if (!user) signInElement = <SignIn />
  else if (isOwner) signInElement = <Navigate to="/owner" replace />
  else signInElement = <NotOwnerAccess />

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route index element={<Navigate to="/owner" replace />} />
        <Route path="/sign-in" element={signInElement} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/owner/onboarding" element={<RequireAuth><OwnerOnboarding /></RequireAuth>} />
        <Route path="/owner/catch-up" element={<RequireOwner><OwnerCatchUp /></RequireOwner>} />
        <Route
          path="/owner"
          element={<RequireOwner><OwnerLayout /></RequireOwner>}
        >
          <Route index element={<Navigate to="/owner/dashboard" replace />} />
          <Route path="dashboard" element={<OwnerDashboard />} />
          <Route path="activity" element={<OwnerActivity />} />
          <Route path="customers" element={<OwnerCustomers />} />
          <Route path="products" element={<OwnerProducts />} />
          <Route path="services" element={<OwnerServices />} />
          <Route path="rewards" element={<OwnerRewards />} />
          <Route path="program" element={<OwnerProgram />} />
          <Route path="settings" element={<OwnerSettings />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function AppAdmin() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <AppRoutes />
      </CurrencyProvider>
    </AuthProvider>
  )
}
