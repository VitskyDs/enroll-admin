import { test, expect } from '@playwright/test'

// Auth guard
test('unauthenticated /owner/program redirects to sign-in', async ({ page }) => {
  await page.goto('/owner/program')
  await expect(page).toHaveURL('/sign-in')
})

// Structural tests — require an authenticated owner session.
test.describe('loyalty program view structure (requires owner auth)', () => {
  test.skip(true, 'requires owner auth fixture')

  test('shows Loyalty program heading (AC#2)', async ({ page }) => {
    await page.goto('/owner/program')
    await expect(page.getByRole('heading', { name: /loyalty program/i })).toBeVisible()
  })

  test('shows all section headings (AC#1)', async ({ page }) => {
    await page.goto('/owner/program')
    await expect(page.getByText('Earn rules')).toBeVisible()
    await expect(page.getByText('Birthday bonus')).toBeVisible()
    await expect(page.getByText('Tiers')).toBeVisible()
    await expect(page.getByText('Referral rules')).toBeVisible()
    await expect(page.getByText('Punch card')).toBeVisible()
  })

  test('renders program settings as read-only, with no Save buttons (AC#1)', async ({ page }) => {
    await page.goto('/owner/program')
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0)
  })

  test('renders no editable inputs on the page (AC#1)', async ({ page }) => {
    await page.goto('/owner/program')
    await expect(page.locator('input')).toHaveCount(0)
  })

  test('shows an Edit entry point (AC#3)', async ({ page }) => {
    await page.goto('/owner/program')
    await expect(page.getByRole('button', { name: /edit/i })).toBeVisible()
  })

  test('earn rules displays points per dollar and per visit values (AC#1)', async ({ page }) => {
    await page.goto('/owner/program')
    await expect(page.getByText('Points per dollar')).toBeVisible()
    await expect(page.getByText('Points per visit')).toBeVisible()
  })

  test('tiers section displays configured tiers (AC#1)', async ({ page }) => {
    await page.goto('/owner/program')
    const tiersSection = page.locator('section').filter({ hasText: 'Tiers' })
    await expect(tiersSection).toBeVisible()
  })

  test('referral rules displays referrer and referee point values (AC#1)', async ({ page }) => {
    await page.goto('/owner/program')
    await expect(page.getByText('Referrer points')).toBeVisible()
    await expect(page.getByText('Referee points')).toBeVisible()
  })

  test('punch card displays enabled/disabled status (AC#1)', async ({ page }) => {
    await page.goto('/owner/program')
    const punchSection = page.locator('section').filter({ hasText: 'Punch card' })
    await expect(punchSection.getByText(/enabled|disabled/i)).toBeVisible()
  })
})
