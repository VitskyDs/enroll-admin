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

  // TASK-98 — the product-images bucket didn't exist, so uploads always failed silently
  // and the product saved with no image. Migration 20260705180500 created the bucket.
  const TINY_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  )

  test('uploading an image on create persists it and shows on reopening the edit drawer (TASK-98 AC#1, #2)', async ({ page }) => {
    await page.goto('/owner/products')
    await page.getByRole('button', { name: /add product/i }).click()
    await page.getByLabel(/name/i).fill('E2E Image Product')
    await page.getByLabel(/price/i).fill('5.00')
    await page.locator('input[type=file]').setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })
    await page.getByRole('button', { name: /add product/i }).last().click()
    await expect(page.getByText('E2E Image Product')).toBeVisible()

    await page.getByText('E2E Image Product').click()
    await expect(page.getByAltText('E2E Image Product')).toBeVisible()
  })

  // TASK-98 AC#3 — a failed storage upload must surface an error, not save silently with no image.
  test('surfaces an error and does not save when the image upload fails (TASK-98 AC#3)', async ({ page }) => {
    await page.route('**/storage/v1/object/product-images/**', route =>
      route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Bucket not found' }) }),
    )
    await page.goto('/owner/products')
    await page.getByRole('button', { name: /add product/i }).click()
    await page.getByLabel(/name/i).fill('Should Not Save')
    await page.getByLabel(/price/i).fill('5.00')
    await page.locator('input[type=file]').setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })
    await page.getByRole('button', { name: /add product/i }).last().click()
    await expect(page.getByText(/image upload failed/i)).toBeVisible()
    await expect(page.getByText('Should Not Save')).not.toBeVisible()
  })
})
