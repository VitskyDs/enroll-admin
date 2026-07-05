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

  // TASK-103 — handleSave() previously never re-checked uniqueness, so saving a taken
  // slug without blurring the field first went straight to the DB and could surface a
  // raw Postgres error instead of the friendly message. Mocks the uniqueness query so
  // the taken slug is caught on save alone, with no blur event fired.
  test('saving a taken slug shows the friendly error and blocks the save, even without blurring first (TASK-103 AC#1, #2)', async ({ page }) => {
    await page.route('**/rest/v1/businesses?select=id*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'some-other-business-id' }),
      }),
    )
    await page.goto('/owner/settings')
    const slugInput = page.getByLabel(/slug/i)
    await slugInput.fill('taken-slug')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/this slug is already taken/i)).toBeVisible()
    await expect(page.getByText('Settings saved')).not.toBeVisible()
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
