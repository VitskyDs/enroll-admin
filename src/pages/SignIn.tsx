import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useTenant, rememberAuthTenant } from '@/hooks/useTenant'
const isEmailAuthEnabled =
  import.meta.env.VITE_ENABLE_EMAIL_AUTH === 'true' ||
  import.meta.env.DEV ||
  (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app'))
import { Button } from '@vitskyds/enroll-ui'
import { Input } from '@vitskyds/enroll-ui'

export default function SignIn() {
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()
  const tenant = useTenant()

  async function handleGoogleSignIn() {
    setLoading(true)
    rememberAuthTenant(tenant)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="flex flex-col h-full px-6">
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-2">
          <span className="text-primary-foreground text-2xl font-bold select-none">E</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('signIn.tagline')}</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          {t('signIn.subtitle')}
        </p>
      </div>

      <div className="pb-12 flex flex-col gap-3">
        <Button
          variant="outline"
          className="w-full gap-3 h-12 text-sm font-medium"
          disabled={loading}
          onClick={handleGoogleSignIn}
        >
          <GoogleLogo />
          {t('signIn.continueGoogle')}
        </Button>
        {isEmailAuthEnabled && <DevSignIn disabled={loading} />}
      </div>
    </div>
  )
}

// Email/password sign-in, shown only in local dev and on preview deployments
// (never in production). Lets testers sign in or self-register without the
// Google OAuth round-trip — the only practical way to reach the admin app on
// a dynamic preview URL.
function DevSignIn({ disabled }: { disabled: boolean }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setMessage(null)
    const { data, error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }
    // Sign-up with email confirmation on returns a user but no session — surface
    // a hint instead of silently doing nothing. Otherwise the auth state change
    // re-renders /sign-in and redirects home.
    if (mode === 'signup' && !data.session) {
      setMessage('Account created. Check your email to confirm, then sign in.')
      setMode('signin')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 pt-2 border-t">
      <p className="text-xs text-muted-foreground text-center pt-2">Testing sign-in (preview only)</p>
      <Input
        type="email"
        autoComplete="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {message && <p className="text-xs text-emerald-600">{message}</p>}
      <Button type="submit" variant="secondary" className="w-full h-10 text-sm" disabled={disabled || submitting}>
        {submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in with email' : 'Create account'}
      </Button>
      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
        onClick={() => { setMode(m => (m === 'signin' ? 'signup' : 'signin')); setError(null); setMessage(null) }}
      >
        {mode === 'signin' ? 'Create account' : 'Have an account? Sign in'}
      </button>
    </form>
  )
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908C16.658 14.1 17.64 11.79 17.64 9.2Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.26c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  )
}
