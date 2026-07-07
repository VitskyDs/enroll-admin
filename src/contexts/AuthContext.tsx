import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

type AuthContextValue = {
  user: User | null
  session: Session | null
  isLoading: boolean
  businessId: string | null
  brandColor: string | null
  isOwner: boolean
  ownedBusinessId: string | null
  isOwnerLoading: boolean
  setBusinessId: (id: string) => void
  setOwnedBusinessId: (id: string) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [brandColor, setBrandColor] = useState<string | null>(null)
  const [ownedBusinessId, setOwnedBusinessId] = useState<string | null>(null)
  // Tracks which user's ownership has actually been resolved, so isOwnerLoading
  // is derived (never one render frame stale) instead of toggled by the effect —
  // otherwise there's a frame where `user` has updated but the loading flag
  // hasn't caught up yet, and RequireOwner reads isOwner as false-not-loading.
  const [ownerResolvedForUserId, setOwnerResolvedForUserId] = useState<string | null>(null)
  const isOwnerLoading = (user?.id ?? null) !== ownerResolvedForUserId

  useEffect(() => {
    if (!user) { setOwnedBusinessId(null); setOwnerResolvedForUserId(null); return }
    supabase.from('business_owners').select('business_id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        setOwnedBusinessId(data?.business_id ?? null)
        setOwnerResolvedForUserId(user.id)
      })
  }, [user])

  useEffect(() => {
    if (!businessId) { setBrandColor(null); return }
    supabase
      .from('businesses')
      .select('brand_color')
      .eq('id', businessId)
      .single()
      .then(({ data }) => setBrandColor(data?.brand_color ?? null))
  }, [businessId])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setBusinessId(null)
    setBrandColor(null)
    setOwnedBusinessId(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      businessId,
      brandColor,
      isOwner: !!ownedBusinessId,
      ownedBusinessId,
      isOwnerLoading,
      setBusinessId,
      setOwnedBusinessId,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
