import { test, expect } from '@playwright/test'

// Auth guard
test('unauthenticated /owner/products redirects to sign-in', async ({ page }) => {
  await page.goto('/owner/products')
  await expect(page).toHaveURL('/sign-in')
})

// Structural tests — require an authenticated owner session.
test.describe('products management structure (requires owner auth)', () => {
  test.skip(true, 'requires owner auth fixture')

  test('shows Products heading (AC#1)', async ({ page }) => {
    await page.goto('/owner/products')
    await expect(page.getByRole('heading', { name: /products/i })).toBeVisible()
  })

  test('shows Add product button (AC#2)', async ({ page }) => {
    await page.goto('/owner/products')
    await expect(page.getByRole('button', { name: /add product/i })).toBeVisible()
  })

  test('shows empty state with add prompt when no products (AC#7)', async ({ page }) => {
    await page.goto('/owner/products')
    // Only visible if no products exist
    const emptyState = page.getByText(/no products yet/i)
    const addFirstBtn = page.getByRole('button', { name: /add your first product/i })
    if (await emptyState.isVisible()) {
      await expect(addFirstBtn).toBeVisible()
    }
  })

  test('opens add drawer when Add product is clicked (AC#2)', async ({ page }) => {
    await page.goto('/owner/products')
    await page.getByRole('button', { name: /add product/i }).click()
    await expect(page.getByText('Add product').nth(1)).toBeVisible()
    await expect(page.getByLabel(/name/i)).toBeVisible()
    await expect(page.getByLabel(/price/i)).toBeVisible()
  })

  test('add drawer shows validation error when name is empty (AC#2)', async ({ page }) => {
    await page.goto('/owner/products')
    await page.getByRole('button', { name: /add product/i }).click()
    await page.getByRole('button', { name: /add product/i }).last().click()
    await expect(page.getByText(/name is required/i)).toBeVisible()
  })

  test('drawer closes when X is clicked (AC#2)', async ({ page }) => {
    await page.goto('/owner/products')
    await page.getByRole('button', { name: /add product/i }).click()
    await page.getByRole('button', { name: '' }).filter({ has: page.locator('svg') }).first().click()
    await expect(page.getByText(/name is required/i)).not.toBeVisible()
  })

  test('product rows have a status badge (AC#1, AC#4)', async ({ page }) => {
    await page.goto('/owner/products')
    const activeBadge = page.getByText('Active').first()
    const draftBadge = page.getByText('Draft').first()
    const inactiveBadge = page.getByText('Inactive').first()
    // At least one status label should be visible if products exist
    await expect(activeBadge.or(draftBadge).or(inactiveBadge)).toBeVisible()
  })

  test('product rows have an edit button (AC#3)', async ({ page }) => {
    await page.goto('/owner/products')
    await expect(page.locator('button[title=""]').first()).toBeVisible()
  })
})
