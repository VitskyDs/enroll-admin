import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

export default function SignIn() {
  const [loading, setLoading] = useState(false)

  async function handleGoogleSignIn() {
    setLoading(true)
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
        <h1 className="text-2xl font-semibold tracking-tight">Enroll</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          Track points, earn rewards, and discover services from businesses you love.
        </p>
      </div>

      <div className="pb-12">
        <Button
          variant="outline"
          className="w-full gap-3 h-12 text-sm font-medium"
          disabled={loading}
          onClick={handleGoogleSignIn}
        >
          <GoogleLogo />
          Continue with Google
        </Button>
      </div>
    </div>
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
