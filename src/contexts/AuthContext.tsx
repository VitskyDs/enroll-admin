import type { ReactNode } from 'react'
import { AuthProvider as CoreAuthProvider, useAuth as useAuthCore } from '@vitskyds/enroll-core'
import { supabase } from '@/lib/supabase'

export function AuthProvider({ children }: { children: ReactNode }) {
  return <CoreAuthProvider supabase={supabase}>{children}</CoreAuthProvider>
}

export function useAuth() {
  return useAuthCore()
}
