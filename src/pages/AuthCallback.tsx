import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

function getPostAuthDestination() {
  if (sessionStorage.getItem('enrollmentPending') === '1') {
    sessionStorage.removeItem('enrollmentPending')
    return '/home?flow=enroll'
  }
  const pending = sessionStorage.getItem('pendingJoinSlug')
  const ref = sessionStorage.getItem('pendingJoinRef')
  if (ref) sessionStorage.removeItem('pendingJoinRef')
  return pending ? `/join/${pending}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}` : '/home'
}

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

    async function resolveDestination(userId: string) {
      const { data } = await supabase.from('businesses').select('id').eq('owner_id', userId).maybeSingle()
      return data ? '/owner/dashboard' : getPostAuthDestination()
    }

    if (code) {
      // PKCE flow
      supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
        if (error) { navigate('/sign-in', { replace: true }); return }
        navigate(await resolveDestination(data.session.user.id), { replace: true })
      })
      return
    }

    // Implicit flow — Supabase auto-detects tokens from the URL hash.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        navigate(await resolveDestination(session.user.id), { replace: true })
        return
      }
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        subscription.unsubscribe()
        if (!session) { navigate('/sign-in', { replace: true }); return }
        resolveDestination(session.user.id).then(dest => navigate(dest, { replace: true }))
      })
    })
  }, [navigate])

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground text-sm">Signing you in…</p>
    </div>
  )
}
