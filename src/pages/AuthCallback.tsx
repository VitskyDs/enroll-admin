import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const signInPath = '/sign-in'
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error) {
      navigate(signInPath, { replace: true })
      return
    }

    // A signed-in non-owner lands on /sign-in too — AppAdmin.tsx renders the
    // NotOwnerAccess screen there instead of looping back to Google.
    async function resolveDestination(userId: string) {
      const { data } = await supabase.from('business_owners').select('business_id').eq('user_id', userId).maybeSingle()
      return data ? '/owner/dashboard' : signInPath
    }

    if (code) {
      // PKCE flow
      supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
        if (error) { navigate(signInPath, { replace: true }); return }
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
        if (!session) { navigate(signInPath, { replace: true }); return }
        resolveDestination(session.user.id).then(dest => navigate(dest, { replace: true }))
      })
    })
  }, [navigate])

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground text-sm">{t('authCallback.signingIn')}</p>
    </div>
  )
}
