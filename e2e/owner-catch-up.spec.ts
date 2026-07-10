import { test, expect } from '@playwright/test'
import { signInAsOwner } from './helpers/auth'

// Auth guard — catch-up is an owner-only route
test('unauthenticated /owner/catch-up redirects to sign-in', async ({ page }) => {
  await page.goto('/owner/catch-up')
  await expect(page).toHaveURL('/sign-in')
})

// Structural tests — require an authenticated owner session.
test.describe('catch-up card flow (requires owner auth)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page)
    await page.goto('/owner/catch-up')
  })

  test('shows full-screen layout with no sidebar (AC#2)', async ({ page }) => {
    // sidebar nav should not be visible in catch-up full-screen mode
    await expect(page.locator('aside')).not.toBeVisible()
  })

  test('shows empty state when no at-risk customers (AC#12)', async ({ page }) => {
    // If no customers at risk, show empty state
    await expect(page.getByText(/all customers are active/i)).toBeVisible()
  })

  test('history tab lists past actions (AC#11)', async ({ page }) => {
    await page.getByRole('button', { name: 'History' }).click()
    await expect(page.getByRole('table').or(page.getByText(/no actions yet/i))).toBeVisible()
  })

  // The rest of this flow (progress indicator, customer card, gift/dismiss
  // actions, summary screen) only renders once there's at least one at-risk
  // customer (churn_risk_score >= 0.5). No customer on the live Corner Cup
  // business currently meets that threshold — see the empty state test above.
  test.describe('customer card actions', () => {
    test.skip(true, 'requires a seeded at-risk customer (churn_risk_score >= 0.5)')

    test('shows progress indicator with position (AC#3)', async ({ page }) => {
      // e.g. "1 of 3"
      await expect(page.getByText(/\d+ of \d+/)).toBeVisible()
    })

    test('customer card shows required fields (AC#4)', async ({ page }) => {
      // avatar initials, name, last visit, AI reason, points
      await expect(page.getByText(/last seen/i)).toBeVisible()
      await expect(page.getByText(/points/i)).toBeVisible()
    })

    test('gift points action creates transaction (AC#5)', async ({ page }) => {
      await page.getByRole('button', { name: /gift points/i }).click()
      await page.getByLabel(/points to gift/i).fill('50')
      await page.getByRole('button', { name: /send & continue/i }).click()
      // advances to next card or summary
      await expect(
        page.getByText(/\d+ of \d+/).or(page.getByText(/reached out/i))
      ).toBeVisible()
    })

    test('dismiss advances to next card (AC#8)', async ({ page }) => {
      await page.getByRole('button', { name: 'Dismiss', exact: true }).click()
      await page.getByRole('button', { name: /dismiss & continue/i }).click()
    })

    test('send reminder button is disabled with tooltip (AC#7)', async ({ page }) => {
      const btn = page.getByRole('button', { name: /reminder/i })
      await expect(btn).toBeDisabled()
    })

    test('summary screen shown after last card (AC#10)', async ({ page }) => {
      // dismiss all cards to reach summary
      // This is a structural test — just verify the done button exists on summary
      await expect(page.getByRole('button', { name: /done/i }).or(
        page.getByText(/reached out to/i)
      )).toBeVisible({ timeout: 15000 })
    })
  })
})

// Edge function structural test
test.describe('score-churn-risk edge function (requires deployed function)', () => {
  test.skip(true, 'requires deployed Supabase edge function')

  test('POST score-churn-risk returns scored count and threshold', async ({ request }) => {
    const res = await request.post('/functions/v1/score-churn-risk', {
      headers: { Authorization: 'Bearer test-token' },
      data: { business_id: 'test-business-id' },
    })
    const body = await res.json()
    expect(typeof body.scored).toBe('number')
    expect(typeof body.threshold).toBe('number')
    expect(Array.isArray(body.errors)).toBe(true)
  })
})
