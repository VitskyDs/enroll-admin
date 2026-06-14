import { test, expect } from '@playwright/test'

// Auth guard
test('unauthenticated /owner/customers redirects to sign-in', async ({ page }) => {
  await page.goto('/owner/customers')
  await expect(page).toHaveURL('/sign-in')
})

// Structural tests — require an authenticated owner session.
test.describe('customer list structure (requires owner auth)', () => {
  test.skip(true, 'requires owner auth fixture')

  test('shows Customers heading (AC#1)', async ({ page }) => {
    await page.goto('/owner/customers')
    await expect(page.getByRole('heading', { name: /customers/i })).toBeVisible()
  })

  test('shows search input (AC#2)', async ({ page }) => {
    await page.goto('/owner/customers')
    await expect(page.getByPlaceholder(/search by name or email/i)).toBeVisible()
  })

  test('shows tier, status, and last visit filter selects (AC#3)', async ({ page }) => {
    await page.goto('/owner/customers')
    await expect(page.getByRole('combobox').first()).toBeVisible()
  })

  test('filter chips appear when a filter is set (AC#7)', async ({ page }) => {
    await page.goto('/owner/customers')
    const tierSelect = page.locator('select').first()
    await tierSelect.selectOption('gold')
    await expect(page.getByText(/tier: gold/i)).toBeVisible()
  })

  test('removing a filter chip clears that filter (AC#7)', async ({ page }) => {
    await page.goto('/owner/customers')
    const tierSelect = page.locator('select').first()
    await tierSelect.selectOption('gold')
    await expect(page.getByText(/tier: gold/i)).toBeVisible()
    await page.getByLabel(/remove tier/i).click()
    await expect(page.getByText(/tier: gold/i)).not.toBeVisible()
  })

  test('empty state shown when no customers match filters (AC#8)', async ({ page }) => {
    await page.goto('/owner/customers')
    await page.getByPlaceholder(/search by name or email/i).fill('xxxxxxxxxnoexist')
    await expect(page.getByText(/no customers match your filters/i)).toBeVisible()
  })

  test('desktop table column headers are visible (AC#1, AC#4)', async ({ page }) => {
    await page.goto('/owner/customers')
    await expect(page.getByText('Name')).toBeVisible()
    await expect(page.getByText('Tier')).toBeVisible()
    await expect(page.getByText('Points')).toBeVisible()
    await expect(page.getByText('Last visit')).toBeVisible()
    await expect(page.getByText('Joined')).toBeVisible()
  })
})
