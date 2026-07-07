import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { OwnerLayout } from '@/components/owner-layout'
import { LoadingScreen } from '@/components/loading-screen'
import { Button } from '@vitskyds/enroll-ui'

const SignIn = lazy(() => import('@/pages/SignIn'))
const AuthCallback = lazy(() => import('@/pages/AuthCallback'))
const OwnerDashboard = lazy(() => import('@/pages/owner/Dashboard'))
const OwnerCustomers = lazy(() => import('@/pages/owner/Customers'))
const OwnerProducts = lazy(() => import('@/pages/owner/Products'))
const OwnerRewards = lazy(() => import('@/pages/owner/Rewards'))
const OwnerProgram = lazy(() => import('@/pages/owner/Program'))
const OwnerSettings = lazy(() => import('@/pages/owner/Settings'))
const OwnerCatchUp = lazy(() => import('@/pages/owner/CatchUp'))

// Shown for an authenticated user who isn't an owner of any business — without
// this, RequireOwner sends them to /sign-in, which (seeing a logged-in user)
// sends them straight back to /owner, looping forever.
function NotOwnerAccess() {
  const { signOut } = useAuth()
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-screen px-8 text-center">
      <p className="text-lg font-semibold">This account isn't an owner on any business</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        Sign in with the Google account or email that owns a business on Enroll.
      </p>
      <Button onClick={signOut}>Sign out</Button>
    </div>
  )
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
        <Route path="/owner/catch-up" element={<RequireOwner><OwnerCatchUp /></RequireOwner>} />
        <Route
          path="/owner"
          element={<RequireOwner><OwnerLayout /></RequireOwner>}
        >
          <Route index element={<Navigate to="/owner/dashboard" replace />} />
          <Route path="dashboard" element={<OwnerDashboard />} />
          <Route path="customers" element={<OwnerCustomers />} />
          <Route path="products" element={<OwnerProducts />} />
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
      <AppRoutes />
    </AuthProvider>
  )
}
