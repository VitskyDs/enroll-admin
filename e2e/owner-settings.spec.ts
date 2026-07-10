import { test, expect } from '@playwright/test'
import { signInAsOwner } from './helpers/auth'

// Auth guard
test('unauthenticated /owner/settings redirects to sign-in', async ({ page }) => {
  await page.goto('/owner/settings')
  await expect(page).toHaveURL('/sign-in')
})

// Structural tests — require an authenticated owner session.
// Fields use a plain sibling <label> with no htmlFor/id association, so
// getByLabel doesn't resolve them — placeholder text is used instead.
test.describe('business profile settings (requires owner auth)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page)
    await page.goto('/owner/settings')
  })

  test('shows Business profile heading (AC#1)', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /business profile/i })).toBeVisible()
  })

  test('shows all basic info fields (AC#1)', async ({ page }) => {
    await expect(page.getByPlaceholder('Corner Cup')).toBeVisible()
    await expect(page.getByPlaceholder('corner-cup')).toBeVisible()
    await expect(page.getByPlaceholder('Your neighborhood coffee shop')).toBeVisible()
    await expect(page.locator('select')).toBeVisible()
    await expect(page.getByPlaceholder('123 Main St, City, State')).toBeVisible()
    await expect(page.getByPlaceholder('Mon–Fri 7am–6pm')).toBeVisible()
  })

  test('slug with invalid format shows error on blur (AC#3)', async ({ page }) => {
    const slugInput = page.getByPlaceholder('corner-cup')
    await slugInput.fill('Invalid Slug!')
    await slugInput.blur()
    await expect(page.getByText('Slug must be lowercase letters, numbers, and hyphens only.')).toBeVisible()
  })

  test('slug auto-lowercases on input (AC#3)', async ({ page }) => {
    const slugInput = page.getByPlaceholder('corner-cup')
    await slugInput.fill('MySlug')
    await expect(slugInput).toHaveValue('myslug')
  })

  // TASK-111 — clearing the slug field used to leave it empty (blocked on save with
  // "Slug is required"); it should instead snap back to the originally-saved value.
  test('clearing the slug reverts it to the originally-saved value (TASK-111 AC#1)', async ({ page }) => {
    const slugInput = page.getByPlaceholder('corner-cup')
    const original = await slugInput.inputValue()
    await slugInput.fill('some-other-slug')
    await slugInput.fill('')
    await expect(slugInput).toHaveValue(original)
  })

  // TASK-111 — typing a new, available slug should live-validate (debounced) and show
  // a green checkmark, without needing to blur or click Save first.
  test('typing a new available slug shows a checkmark, no error (TASK-111 AC#2, #4)', async ({ page }) => {
    await page.route('**/rest/v1/businesses?select=id*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: 'null' }),
    )
    await page.getByPlaceholder('corner-cup').fill('brand-new-available-slug')
    await expect(page.getByLabel('Slug is available')).toBeVisible()
    await expect(page.getByText(/already taken/i)).not.toBeVisible()
  })

  // TASK-111 — typing a taken slug should show the error state and checkmark live,
  // before any blur or save — not just when Save is clicked (that's TASK-103's test below).
  test('typing a taken slug shows the error state live, no checkmark (TASK-111 AC#3)', async ({ page }) => {
    await page.route('**/rest/v1/businesses?select=id*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'some-other-business-id' }) }),
    )
    await page.getByPlaceholder('corner-cup').fill('taken-live-slug')
    await expect(page.getByText(/this slug is already taken/i)).toBeVisible()
    await expect(page.getByLabel('Slug is available')).not.toBeVisible()
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
    const slugInput = page.getByPlaceholder('corner-cup')
    await slugInput.fill('taken-slug')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/this slug is already taken/i)).toBeVisible()
    await expect(page.getByText('Settings saved')).not.toBeVisible()
  })

  test('shows logo and cover image upload areas (AC#4, AC#5)', async ({ page }) => {
    await expect(page.getByText('Logo', { exact: true })).toBeVisible()
    await expect(page.getByText('Cover image', { exact: true })).toBeVisible()
  })

  test('shows brand color section with color picker and hex input (AC#6)', async ({ page }) => {
    await expect(page.getByText('Brand color', { exact: true })).toBeVisible()
    await expect(page.locator('input[type="color"]')).toBeVisible()
  })

  // TASK-93 — mocks the settings-load query so this doesn't depend on the seeded
  // business's real currency value: exercises the "not yet set" state specifically.
  test('shows Not set / USD / ILS options when currency is unset (TASK-93 AC#4, TASK-104 AC#2)', async ({ page }) => {
    await page.route('**/rest/v1/businesses?select=name%2Cslug*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          name: 'Corner Cup', slug: 'corner-cup', tagline: '', industry: '', address: '',
          hours: '', brand_color: '#000000', logo_url: null, cover_image_url: null, currency: null,
        }),
      }),
    )
    await page.goto('/owner/settings')
    await expect(page.getByText('Store currency')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Not set' })).toBeVisible()
    await expect(page.getByRole('button', { name: '$ USD' })).toBeVisible()
    await expect(page.getByRole('button', { name: '₪ ILS' })).toBeVisible()
  })

  // TASK-104 AC#1 — once a currency is already set, the toggle is replaced by a
  // locked read-only pill; the buttons must not render at all.
  test('shows a locked read-only pill when currency is already set (TASK-104 AC#1)', async ({ page }) => {
    await page.route('**/rest/v1/businesses?select=name%2Cslug*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          name: 'Corner Cup', slug: 'corner-cup', tagline: '', industry: '', address: '',
          hours: '', brand_color: '#000000', logo_url: null, cover_image_url: null, currency: 'usd',
        }),
      }),
    )
    await page.goto('/owner/settings')
    await expect(page.getByText('$ USD')).toBeVisible()
    await expect(page.getByText(/locked once set/i)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Not set' })).not.toBeVisible()
    await expect(page.getByRole('button', { name: '₪ ILS' })).not.toBeVisible()
  })

  // TASK-104 AC#1 — the regression the code reviewer caught: the lock must engage
  // immediately after a successful save, in the same session, with no reload.
  // The save PATCH is mocked too — this business's currency is real seeded data
  // (migration 20260611120000 sets corner-cup to 'usd') and the lock is permanent
  // and can't be undone through the UI, so this must never hit the live DB.
  test('selecting a currency and saving locks the control immediately, same session (TASK-104 AC#1)', async ({ page }) => {
    await page.route('**/rest/v1/businesses?select=name%2Cslug*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          name: 'Corner Cup', slug: 'corner-cup', tagline: '', industry: '', address: '',
          hours: '', brand_color: '#000000', logo_url: null, cover_image_url: null, currency: null,
        }),
      }),
    )
    await page.route('**/rest/v1/businesses?id=eq.*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    )
    await page.goto('/owner/settings')
    await page.getByRole('button', { name: '₪ ILS' }).click()
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText('Settings saved')).toBeVisible()
    await expect(page.getByText('₪ ILS')).toBeVisible()
    await expect(page.getByRole('button', { name: '₪ ILS' })).not.toBeVisible()
  })

  test('shows validation error when name is cleared and saved (AC#1)', async ({ page }) => {
    await page.getByPlaceholder('Corner Cup').fill('')
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/business name is required/i)).toBeVisible()
  })
})
