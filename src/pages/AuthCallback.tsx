import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(() => {
        navigate('/home', { replace: true })
      })
    } else {
      navigate('/sign-in', { replace: true })
    }
  }, [navigate])

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-muted-foreground text-sm">Signing you in…</p>
    </div>
  )
}
