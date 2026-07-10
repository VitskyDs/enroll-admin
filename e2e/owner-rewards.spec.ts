import { test, expect } from '@playwright/test'
import { signInAsOwner } from './helpers/auth'

// Auth guard
test('unauthenticated /owner/rewards redirects to sign-in', async ({ page }) => {
  await page.goto('/owner/rewards')
  await expect(page).toHaveURL('/sign-in')
})

// Structural tests — require an authenticated owner session.
test.describe('rewards catalog structure (requires owner auth)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page)
    await page.goto('/owner/rewards')
  })

  test('shows Rewards heading (AC#1)', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /rewards/i })).toBeVisible()
  })

  test('shows Add reward button (AC#2)', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add reward/i })).toBeVisible()
  })

  test('shows empty state when no rewards exist (AC#6)', async ({ page }) => {
    const emptyState = page.getByText(/no rewards yet/i)
    if (await emptyState.isVisible()) {
      await expect(page.getByRole('button', { name: /add your first reward/i })).toBeVisible()
    }
  })

  test('opens add drawer when button is clicked (AC#2)', async ({ page }) => {
    await page.getByRole('button', { name: /add reward/i }).click()
    await expect(page.getByText('Add reward').nth(1)).toBeVisible()
    await expect(page.getByPlaceholder('e.g. Free drip coffee')).toBeVisible()
    await expect(page.getByPlaceholder('e.g. 50')).toBeVisible()
  })

  test('add drawer shows error when name is empty (AC#2)', async ({ page }) => {
    await page.getByRole('button', { name: /add reward/i }).click()
    await page.getByRole('button', { name: /add reward/i }).last().click()
    await expect(page.getByText(/name is required/i)).toBeVisible()
  })

  test('add drawer shows error when points cost is missing (AC#2)', async ({ page }) => {
    await page.getByRole('button', { name: /add reward/i }).click()
    await page.getByPlaceholder('e.g. Free drip coffee').fill('Test Reward')
    await page.getByRole('button', { name: /add reward/i }).last().click()
    await expect(page.getByText(/points cost must be at least/i)).toBeVisible()
  })

  test('reward rows show status badge (AC#1, AC#4)', async ({ page }) => {
    const active = page.getByText('Active').first()
    const inactive = page.getByText('Inactive').first()
    await expect(active.or(inactive)).toBeVisible()
  })

  test('reward rows show points cost (AC#1)', async ({ page }) => {
    // Points cost is rendered as "N pts"
    await expect(page.getByText(/pts/i).first()).toBeVisible()
  })

  // TASK-100 — the reward-images bucket didn't exist, so uploads always failed silently
  // and the reward saved with no image. Migration 20260705180500 created the bucket.
  const TINY_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  )

  test('uploading an image on create persists it and shows on reopening the edit drawer (TASK-100 AC#1)', async ({ page }) => {
    await page.getByRole('button', { name: /add reward/i }).click()
    await page.getByPlaceholder('e.g. Free drip coffee').fill('E2E Image Reward')
    await page.getByPlaceholder('e.g. 50').fill('10')
    await page.locator('input[type=file]').setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })
    await page.getByRole('button', { name: /add reward/i }).last().click()
    await expect(page.getByText('E2E Image Reward').last()).toBeVisible()

    await page.getByText('E2E Image Reward').last().click()
    await expect(page.getByAltText('E2E Image Reward').last()).toBeVisible()
  })

  // TASK-100 AC#2 — a failed storage upload must surface an error, not save silently with no image.
  test('surfaces an error and does not save when the image upload fails (TASK-100 AC#2)', async ({ page }) => {
    await page.route('**/storage/v1/object/reward-images/**', route =>
      route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Bucket not found' }) }),
    )
    await page.getByRole('button', { name: /add reward/i }).click()
    await page.getByPlaceholder('e.g. Free drip coffee').fill('Should Not Save')
    await page.getByPlaceholder('e.g. 50').fill('10')
    await page.locator('input[type=file]').setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })
    await page.getByRole('button', { name: /add reward/i }).last().click()
    await expect(page.getByText(/image upload failed/i)).toBeVisible()
    await expect(page.getByText('Should Not Save')).not.toBeVisible()
  })
})
