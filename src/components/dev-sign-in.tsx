import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@vitskyds/enroll-ui'

// Email/password sign-in, shown only in local dev and on preview deployments
// (never in production). Lets testers sign in or self-register without the
// Google OAuth round-trip — the only practical way to reach the admin app on
// a dynamic preview URL. Shared between the full-page sign-in screen and the
// guest Home sign-in drawer.
export function DevSignIn({ disabled, onSignedIn }: { disabled: boolean; onSignedIn?: () => void }) {
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
    if (data.session) {
      onSignedIn?.()
      return
    }
    // Sign-up with email confirmation on returns a user but no session — surface
    // a hint instead of silently doing nothing. Otherwise the auth state change
    // re-renders /sign-in and redirects home.
    setMessage('Account created. Check your email to confirm, then sign in.')
    setMode('signin')
    setSubmitting(false)
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
