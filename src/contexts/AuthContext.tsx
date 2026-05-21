import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types'

type AuthContextValue = {
  user: User | null
  session: Session | null
  isLoading: boolean
  enrolledCustomer: Pick<Customer, 'id' | 'points'> | null
  isEnrolled: boolean
  businessId: string | null
  setEnrolledCustomer: (customer: Pick<Customer, 'id' | 'points'> | null) => void
  setBusinessId: (id: string) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [enrolledCustomer, setEnrolledCustomer] = useState<Pick<Customer, 'id' | 'points'> | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)

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
    setEnrolledCustomer(null)
    setBusinessId(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      enrolledCustomer,
      isEnrolled: !!enrolledCustomer,
      businessId,
      setEnrolledCustomer,
      setBusinessId,
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
