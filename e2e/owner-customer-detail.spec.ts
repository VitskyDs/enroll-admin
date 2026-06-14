import { test, expect } from '@playwright/test'

// Auth guard — /owner/customers hosts the detail panel
test('unauthenticated /owner/customers redirects to sign-in', async ({ page }) => {
  await page.goto('/owner/customers')
  await expect(page).toHaveURL('/sign-in')
})

// Structural tests — require an authenticated owner session with at least one customer.
test.describe('customer detail panel (requires owner auth + customers)', () => {
  test.skip(true, 'requires owner auth fixture')

  test('clicking a customer row opens the detail panel (AC#8)', async ({ page }) => {
    await page.goto('/owner/customers')
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText('Gift points')).toBeVisible()
  })

  test('panel header shows customer name and points balance (AC#1)', async ({ page }) => {
    await page.goto('/owner/customers')
    await page.locator('table tbody tr').first().click()
    // Panel shows stats strip with "Points" label
    await expect(page.getByText('Points').first()).toBeVisible()
    await expect(page.getByText('Lifetime')).toBeVisible()
    await expect(page.getByText('Joined')).toBeVisible()
  })

  test('panel shows transaction history section (AC#2)', async ({ page }) => {
    await page.goto('/owner/customers')
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText('Transaction history')).toBeVisible()
  })

  test('panel shows referrals section (AC#4)', async ({ page }) => {
    await page.goto('/owner/customers')
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText(/referrals/i)).toBeVisible()
  })

  test('gift points shows error when amount is empty (AC#5)', async ({ page }) => {
    await page.goto('/owner/customers')
    await page.locator('table tbody tr').first().click()
    await page.getByRole('button', { name: 'Gift' }).click()
    await expect(page.getByText(/enter a positive number/i)).toBeVisible()
  })

  test('panel closes when X is clicked (AC#8)', async ({ page }) => {
    await page.goto('/owner/customers')
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText('Gift points')).toBeVisible()
    // Close button in the panel header
    await page.locator('aside button').first().click()
    await expect(page.getByText('Gift points')).not.toBeVisible()
  })
})
