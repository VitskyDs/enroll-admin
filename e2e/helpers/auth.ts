import type { Page } from '@playwright/test'

// The admin app's /sign-in shows DevSignIn (email/password) whenever
// import.meta.env.DEV is true, i.e. always under `npm run dev:admin` — the only
// way to authenticate in e2e since Google OAuth isn't automatable.
const TEST_PASSWORD = 'EnrollTest123!'

async function submitDevSignIn(page: Page, email: string) {
  await page.goto('/sign-in')
  await page.getByPlaceholder('Email').fill(email)
  await page.getByPlaceholder('Password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Sign in with email' }).click()
}

// owner@test.com owns the Corner Cup business — signing in redirects off
// /sign-in to /owner once AuthContext resolves ownership. Under a fully
// parallel run every owner-*.spec.ts test signs in fresh in beforeEach, which
// bursts a lot of concurrent signInWithPassword calls at the shared dev
// Supabase project — retry a couple of times to absorb that transient
// contention rather than fail the whole test on a timing fluke unrelated to
// the page under test.
export async function signInAsOwner(page: Page) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await submitDevSignIn(page, 'owner@test.com')
    try {
      await page.waitForURL(url => url.pathname !== '/sign-in', { timeout: 10_000 })
      return
    } catch (err) {
      if (attempt === 3) throw err
    }
  }
}

// customer@test.com is an enrolled Corner Cup customer, not a business owner —
// stays on /sign-in, which renders the NotOwnerAccess message (TASK-94).
export async function signInAsNonOwner(page: Page) {
  await submitDevSignIn(page, 'customer@test.com')
}
