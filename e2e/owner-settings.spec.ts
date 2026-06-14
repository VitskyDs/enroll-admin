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

  test('shows validation error when name is cleared and saved (AC#1)', async ({ page }) => {
    await page.goto('/owner/settings')
    await page.getByLabel(/business name/i).fill('')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/business name is required/i)).toBeVisible()
  })
})
