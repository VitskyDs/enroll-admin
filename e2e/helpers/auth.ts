import type { Page } from '@playwright/test'

// The admin app's /sign-in shows DevSignIn (email/password) whenever
// import.meta.env.DEV is true, i.e. always under `npm run dev:admin` — the only
// way to authenticate in e2e since Google OAuth isn't automatable.
const TEST_PASSWORD = 'EnrollTest123!'

// The admin app is Hebrew-only (see src/i18n/force-he.ts), so the sign-in
// form's placeholders/button copy render in Hebrew, not English — target the
// inputs by type/role instead of localized text so this helper doesn't break
// every time copy changes or a new locale is added.
async function submitDevSignIn(page: Page, email: string) {
  await page.goto('/sign-in')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.locator('form button[type="submit"]').click()
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
