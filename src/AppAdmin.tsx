import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { OwnerLayout } from '@/components/owner-layout'
import { LoadingScreen } from '@/components/loading-screen'

const SignIn = lazy(() => import('@/pages/SignIn'))
const AuthCallback = lazy(() => import('@/pages/AuthCallback'))
const OwnerDashboard = lazy(() => import('@/pages/owner/Dashboard'))
const OwnerCustomers = lazy(() => import('@/pages/owner/Customers'))
const OwnerProducts = lazy(() => import('@/pages/owner/Products'))
const OwnerRewards = lazy(() => import('@/pages/owner/Rewards'))
const OwnerProgram = lazy(() => import('@/pages/owner/Program'))
const OwnerSettings = lazy(() => import('@/pages/owner/Settings'))
const OwnerCatchUp = lazy(() => import('@/pages/owner/CatchUp'))

function RequireOwner({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isOwner, isOwnerLoading } = useAuth()
  if (isLoading || isOwnerLoading) return null
  if (!user) return <Navigate to="/sign-in" replace />
  if (!isOwner) return <Navigate to="/sign-in" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user, isLoading } = useAuth()

  useEffect(() => {
    document.documentElement.style.setProperty('--brand', 'oklch(0.145 0 0)')
  }, [])

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route index element={<Navigate to="/owner" replace />} />
        <Route
          path="/sign-in"
          element={isLoading ? null : user ? <Navigate to="/owner" replace /> : <SignIn />}
        />
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
