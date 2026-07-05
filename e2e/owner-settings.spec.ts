import { test, expect } from '@playwright/test'

// Auth guard
test('unauthenticated /owner/settings redirects to sign-in', async ({ page }) => {
  await page.goto('/owner/settings')
  await expect(page).toHaveURL('/sign-in')
})

// Structural tests — require an authenticated owner session.
test.describe('business profile settings (requires owner auth)', () => {
  test.skip(true, 'requires owner auth fixture')

  test('shows Business profile heading (AC#1)', async ({ page }) => {
    await page.goto('/owner/settings')
    await expect(page.getByRole('heading', { name: /business profile/i })).toBeVisible()
  })

  test('shows all basic info fields (AC#1)', async ({ page }) => {
    await page.goto('/owner/settings')
    await expect(page.getByLabel(/business name/i)).toBeVisible()
    await expect(page.getByLabel(/slug/i)).toBeVisible()
    await expect(page.getByLabel(/tagline/i)).toBeVisible()
    await expect(page.getByLabel(/industry/i)).toBeVisible()
    await expect(page.getByLabel(/address/i)).toBeVisible()
    await expect(page.getByLabel(/hours/i)).toBeVisible()
  })

  test('slug with invalid format shows error on blur (AC#3)', async ({ page }) => {
    await page.goto('/owner/settings')
    const slugInput = page.getByLabel(/slug/i)
    await slugInput.fill('Invalid Slug!')
    await slugInput.blur()
    await expect(page.getByText(/lowercase letters, numbers, and hyphens/i)).toBeVisible()
  })

  test('slug auto-lowercases on input (AC#3)', async ({ page }) => {
    await page.goto('/owner/settings')
    const slugInput = page.getByLabel(/slug/i)
    await slugInput.fill('MySlug')
    await expect(slugInput).toHaveValue('myslug')
  })

  test('shows logo and cover image upload areas (AC#4, AC#5)', async ({ page }) => {
    await page.goto('/owner/settings')
    await expect(page.getByText('Logo')).toBeVisible()
    await expect(page.getByText('Cover image')).toBeVisible()
  })

  test('shows brand color section with color picker and hex input (AC#6)', async ({ page }) => {
    await page.goto('/owner/settings')
    await expect(page.getByText('Brand color')).toBeVisible()
    await expect(page.locator('input[type="color"]')).toBeVisible()
  })

  // TASK-93
  test('shows Store currency section with Not set / USD / ILS options (TASK-93 AC#4)', async ({ page }) => {
    await page.goto('/owner/settings')
    await expect(page.getByText('Store currency')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Not set' })).toBeVisible()
    await expect(page.getByRole('button', { name: '$ USD' })).toBeVisible()
    await expect(page.getByRole('button', { name: '₪ ILS' })).toBeVisible()
  })

  // TASK-93
  test('selecting a currency and saving updates businesses.currency (TASK-93 AC#4)', async ({ page }) => {
    await page.goto('/owner/settings')
    await page.getByRole('button', { name: '₪ ILS' }).click()
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText('Settings saved')).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: '₪ ILS' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('shows validation error when name is cleared and saved (AC#1)', async ({ page }) => {
    await page.goto('/owner/settings')
    await page.getByLabel(/business name/i).fill('')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/business name is required/i)).toBeVisible()
  })
})
