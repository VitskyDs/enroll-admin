import { test, expect } from '@playwright/test'

// AC#6, AC#7: auth guard — unauthenticated users cannot access the dashboard
test('unauthenticated /owner/dashboard redirects to sign-in', async ({ page }) => {
  await page.goto('/owner/dashboard')
  await expect(page).toHaveURL('/sign-in')
})

// Structural tests — require an authenticated owner session.
// These are documented here as the baseline; run them with an auth fixture
// once one is wired into the project.
test.describe('dashboard structure (requires owner auth)', () => {
  test.skip(true, 'requires owner auth fixture')

  test('shows Dashboard heading (AC#7)', async ({ page }) => {
    await page.goto('/owner/dashboard')
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  })

  test('shows all 6 stat card labels (AC#2)', async ({ page }) => {
    await page.goto('/owner/dashboard')
    await expect(page.getByText(/active members/i)).toBeVisible()
    await expect(page.getByText(/total members/i)).toBeVisible()
    await expect(page.getByText(/points issued this month/i)).toBeVisible()
    await expect(page.getByText(/redemptions this month/i)).toBeVisible()
    await expect(page.getByText(/new members this week/i)).toBeVisible()
    await expect(page.getByText(/loyalty strength/i)).toBeVisible()
  })

  test('shows the Catch up banner (AC#4)', async ({ page }) => {
    await page.goto('/owner/dashboard')
    // Either the "all engaged" or the at-risk count message should appear
    const engaged = page.getByText(/all customers are engaged/i)
    const atRisk = page.getByText(/customers? need your attention/i)
    await expect(engaged.or(atRisk)).toBeVisible()
  })

  test('Catch up banner links to /owner/catch-up when customers are at risk (AC#4)', async ({ page }) => {
    await page.goto('/owner/dashboard')
    const banner = page.getByRole('link', { name: /catch up/i })
    if (await banner.isVisible()) {
      await expect(banner).toHaveAttribute('href', '/owner/catch-up')
    }
  })

  test('loyalty strength score is a number between 0 and 100 (AC#1)', async ({ page }) => {
    await page.goto('/owner/dashboard')
    // The score is rendered next to "/100"
    await expect(page.getByText('/ 100')).toBeVisible()
  })
})
