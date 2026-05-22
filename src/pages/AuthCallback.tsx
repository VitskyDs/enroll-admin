import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error) {
      navigate('/sign-in', { replace: true })
      return
    }

    if (code) {
      // PKCE flow
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        navigate(error ? '/sign-in' : '/home', { replace: true })
      })
      return
    }

    // Implicit flow — Supabase auto-detects tokens from the URL hash.
    // Check if the session is already established; if not, wait for it.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/home', { replace: true })
        return
      }
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        subscription.unsubscribe()
        navigate(session ? '/home' : '/sign-in', { replace: true })
      })
    })
  }, [navigate])

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground text-sm">Signing you in…</p>
    </div>
  )
}
