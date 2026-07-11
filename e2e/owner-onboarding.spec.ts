import { test, expect } from '@playwright/test'
import { signInAsNonOwner } from './helpers/auth'
import { loadEnv } from './helpers/env'

const env = loadEnv()
const SUPABASE_URL = env.VITE_SUPABASE_URL
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY

test.describe('owner onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsNonOwner(page)
    // Wait for auth + ownership to resolve before navigating away — sign-in
    // itself doesn't confirm completion, and navigating too early can race
    // the session write, sending /owner/onboarding's RequireAuth to /sign-in.
    await expect(page.getByText("This account isn't an owner on any business")).toBeVisible()
    await page.goto('/owner/onboarding')
  })

  test('shows the opening greeting and business name input', async ({ page }) => {
    await expect(page.getByText(/I'll help you set up your business/i)).toBeVisible()
    await expect(page.getByPlaceholder(/Corner Cup/i)).toBeVisible()
  })

  test('advances to website step after entering business name', async ({ page }) => {
    await page.getByPlaceholder(/Corner Cup/i).fill('Test Biz')
    await page.getByPlaceholder(/Corner Cup/i).press('Enter')
    await expect(page.getByText(/what's your website/i)).toBeVisible()
  })

  test('shows product input options when website is skipped', async ({ page }) => {
    await page.getByPlaceholder(/Corner Cup/i).fill('Test Biz')
    await page.getByPlaceholder(/Corner Cup/i).press('Enter')
    await expect(page.getByText(/what's your website/i)).toBeVisible()
    await page.getByRole('button', { name: /skip/i }).click()
    await expect(page.getByText(/how would you like to share/i)).toBeVisible()
  })

  test('resets the flow when start over is clicked', async ({ page }) => {
    await page.getByPlaceholder(/Corner Cup/i).fill('Test Biz')
    await page.getByPlaceholder(/Corner Cup/i).press('Enter')
    await expect(page.getByText(/what's your website/i)).toBeVisible()
    await page.getByRole('button', { name: /start over/i }).click()
    await expect(page.getByPlaceholder(/Corner Cup/i)).toBeVisible()
    await expect(page.getByText(/what's your website/i)).not.toBeVisible()
  })

  test('empty business name does not advance', async ({ page }) => {
    await expect(page.getByPlaceholder(/Corner Cup/i)).toBeVisible()
    await page.getByPlaceholder(/Corner Cup/i).press('Enter')
    await expect(page.getByText(/what's your website/i)).not.toBeVisible()
  })
})

// TASK-125: completing the wizard and clicking "Done — launch my program"
// calls handleSubmit, which writes real businesses/loyalty_programs/services
// rows to the shared dev+prod Supabase project (doc-12 — there's no separate
// test database). This test exercises that real write path end to end, then
// verifies and deletes what it created via a direct REST sign-in as
// customer@test.com (separate from the browser session) in a `finally` block
// so no residue survives even if an assertion fails partway through.
// business_owners cascades from businesses (20260706120000_multi_owner_businesses.sql),
// but loyalty_programs.business_id does NOT cascade on the live database despite
// the tracked migration (20260517000001_initial_schema.sql) declaring `on delete
// cascade` — confirmed by hitting a 23503 FK violation while cleaning up an
// orphaned row from this test. The live schema has drifted from tracked
// migrations in more than one way (see TASK-126's note on the same issue for
// brand_voice_summary), so loyalty_programs is deleted explicitly here rather
// than trusting cascade.
//
// If a run is interrupted before cleanup runs, orphaned rows are easy to find
// and remove manually — they're always named "__e2e onboarding submit test
// <timestamp>__". Delete loyalty_programs first, then businesses (FK-safe order):
// `delete from loyalty_programs where business_id in (select id from businesses where name like '__e2e onboarding submit test%');`
// `delete from businesses where name like '__e2e onboarding submit test%';`
//
// The product-extraction edge function is mocked to return no products —
// this test is about the business/program write path, not AI extraction
// (already exercised, without a real network call, by the other tests in
// this file), and skipping products keeps cleanup to just the one cascade.
test.describe('owner onboarding submit path (TASK-125)', () => {
  test.skip(!SUPABASE_URL || !ANON_KEY, 'requires .env with Supabase credentials')

  test.beforeEach(async ({ page }) => {
    await signInAsNonOwner(page)
    await expect(page.getByText("This account isn't an owner on any business")).toBeVisible()
    await page.route('**/functions/v1/extract-products', route => route.fulfill({ json: { products: [] } }))
    await page.goto('/owner/onboarding')
  })

  test('completes the wizard, writes a real business + loyalty program, and lands on the dashboard', async ({ page, request }) => {
    const businessName = `__e2e onboarding submit test ${Date.now()}__`
    let businessId: string | undefined

    // Signed in once up front and reused for both the verification read and the
    // cleanup delete below — three separate password sign-ins for the same
    // account in one test previously tripped Supabase's auth rate limit on the
    // finally block's sign-in, which silently no-op'd the cleanup delete (the
    // result went unchecked) and left a permanent orphaned business row.
    const signIn = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: ANON_KEY!, 'Content-Type': 'application/json' },
      data: { email: 'customer@test.com', password: 'EnrollTest123!' },
    })
    expect(signIn.ok(), 'customer@test.com sign-in should succeed').toBeTruthy()
    const { access_token, user } = await signIn.json()
    const authHeaders = { apikey: ANON_KEY!, Authorization: `Bearer ${access_token}` }

    try {
      await expect(page.getByText(/I'll help you set up your business/i)).toBeVisible()
      await page.getByPlaceholder(/Corner Cup/i).fill(businessName)
      await page.getByPlaceholder(/Corner Cup/i).press('Enter')

      await expect(page.getByText(/what's your website/i)).toBeVisible()
      await page.getByRole('button', { name: /skip/i }).click()

      await expect(page.getByText(/how would you like to share/i)).toBeVisible()
      await page.getByRole('button', { name: 'Enter your website URL' }).click()
      await page.getByPlaceholder('https://yourbusiness.com').fill('https://example.com')
      await page.getByPlaceholder('https://yourbusiness.com').press('Enter')

      await expect(page.getByText(/couldn't find any products/i)).toBeVisible()
      await page.getByRole('button', { name: /skip.*add products later/i }).click()

      await expect(page.getByText(/what's your primary goal/i)).toBeVisible()
      await page.getByRole('button', { name: /gain new members/i }).click()

      await expect(page.getByText(/how often does a typical customer visit/i)).toBeVisible()
      await page.getByRole('button', { name: /weekly or more/i }).click()

      await expect(page.getByText(/what reward would your customers love most/i)).toBeVisible()
      await page.getByRole('button', { name: /points they can redeem/i }).click()

      // The AI thread message and the program-review card both mention the
      // program name — `.last()` targets the card (rendered after the thread).
      await expect(page.getByText(`${businessName} Rewards`).last()).toBeVisible()
      await page.getByRole('button', { name: /done.*launch my program/i }).click()

      await expect(page).toHaveURL('/owner/dashboard')
      await expect(page.getByText(businessName)).toBeVisible()

      // Verify the real writes directly via REST, independent of the browser session.
      const bizRes = await request.get(
        `${SUPABASE_URL}/rest/v1/businesses?select=id,name,owner_id&name=eq.${encodeURIComponent(businessName)}`,
        { headers: authHeaders },
      )
      const [biz] = await bizRes.json()
      expect(biz, 'the business created by the wizard should exist').toBeTruthy()
      expect(biz.owner_id).toBe(user.id)
      businessId = biz.id

      const programRes = await request.get(
        `${SUPABASE_URL}/rest/v1/loyalty_programs?select=program_name,business_id&business_id=eq.${biz.id}`,
        { headers: authHeaders },
      )
      const [program] = await programRes.json()
      expect(program, 'a loyalty program linked to the new business should exist').toBeTruthy()
      expect(program.program_name).toBe(`${businessName} Rewards`)
    } finally {
      if (businessId) {
        // loyalty_programs.business_id doesn't cascade on delete on the live
        // database (see the file header comment) — deleted explicitly first,
        // in FK-safe order.
        const programCleanup = await request.delete(
          `${SUPABASE_URL}/rest/v1/loyalty_programs?business_id=eq.${businessId}`,
          { headers: authHeaders },
        )
        expect(programCleanup.ok(), 'cleanup delete of loyalty_programs should succeed').toBeTruthy()

        const cleanup = await request.delete(`${SUPABASE_URL}/rest/v1/businesses?id=eq.${businessId}`, {
          headers: authHeaders,
        })
        expect(cleanup.ok(), 'cleanup delete should succeed — otherwise this business row is orphaned').toBeTruthy()
      }
    }
  })
})
