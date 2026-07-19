import { test, expect } from '@playwright/test'
import { signInAsOwner } from './helpers/auth'
import { loadEnv } from './helpers/env'

const env = loadEnv()
const SUPABASE_URL = env.VITE_SUPABASE_URL
const ANON_KEY = env.VITE_SUPABASE_ANON_KEY

// Auth guard
test('unauthenticated /owner/settings redirects to sign-in', async ({ page }) => {
  await page.goto('/owner/settings')
  await expect(page).toHaveURL('/sign-in')
})

// Structural tests — require an authenticated owner session.
// Fields use a plain sibling <label> with no htmlFor/id association, so
// getByLabel doesn't resolve them — placeholder text is used instead.
//
// TASK-175: the admin app is Hebrew-only (src/i18n/force-he.ts). Locators
// against this page's own copy (admin.settings.* keys) use the actual
// rendered Hebrew string — confirmed present in the installed
// @vitskyds/enroll-core build, same "don't match localized text with English"
// rule owner-activity.spec.ts and owner-rewards.spec.ts already apply — with
// a couple of exceptions that stay English/locale-agnostic on purpose:
//   - the slug input's placeholder ("corner-cup") and the brand hex input's
//     placeholder ("#000000") are hardcoded literals in Settings.tsx, not
//     translated, so they render the same in every locale
//   - the currency toggle's "$ USD" / "₪ ILS" labels are likewise hardcoded,
//     not translation keys
// The page heading is asserted by role/level only (no text), matching
// owner-rewards.spec.ts's "shows Rewards heading" test, since asserting a
// specific string is unnecessary once role/level already confirms it mounted.
test.describe('business profile settings (requires owner auth)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page)
    await page.goto('/owner/settings')
  })

  test('shows Business profile heading (AC#1)', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('shows all basic info fields (AC#1)', async ({ page }) => {
    await expect(page.getByPlaceholder('קפה הפינה')).toBeVisible()
    await expect(page.getByPlaceholder('corner-cup')).toBeVisible()
    await expect(page.getByPlaceholder('בית הקפה השכונתי שלכם')).toBeVisible()
    await expect(page.locator('select')).toBeVisible()
    await expect(page.getByPlaceholder('רחוב הרצל 1, תל אביב')).toBeVisible()
    await expect(page.getByPlaceholder('א׳–ה׳ 7:00–18:00')).toBeVisible()
  })

  test('slug with invalid format shows error on blur (AC#3)', async ({ page }) => {
    const slugInput = page.getByPlaceholder('corner-cup')
    await slugInput.fill('Invalid Slug!')
    await slugInput.blur()
    await expect(page.getByText('הכתובת יכולה לכלול רק אותיות קטנות באנגלית, ספרות ומקפים.')).toBeVisible()
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
    await expect(page.getByLabel('הכתובת פנויה')).toBeVisible()
    await expect(page.getByText(/כבר תפוסה/)).not.toBeVisible()
  })

  // TASK-111 — typing a taken slug should show the error state and checkmark live,
  // before any blur or save — not just when Save is clicked (that's TASK-103's test below).
  test('typing a taken slug shows the error state live, no checkmark (TASK-111 AC#3)', async ({ page }) => {
    await page.route('**/rest/v1/businesses?select=id*', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'some-other-business-id' }) }),
    )
    await page.getByPlaceholder('corner-cup').fill('taken-live-slug')
    await expect(page.getByText(/כבר תפוסה/)).toBeVisible()
    await expect(page.getByLabel('הכתובת פנויה')).not.toBeVisible()
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
    await page.getByRole('button', { name: 'שמירת השינויים' }).click()
    await expect(page.getByText(/כבר תפוסה/)).toBeVisible()
    await expect(page.getByText('ההגדרות נשמרו')).not.toBeVisible()
  })

  // TASK-175: cover image upload was removed from Settings.tsx (commit
  // db95164, "remove cover image upload, make logo upload square") — only the
  // logo field remains, so this no longer asserts a "Cover image" area.
  test('shows logo upload area (AC#4)', async ({ page }) => {
    await expect(page.getByText('לוגו', { exact: true })).toBeVisible()
  })

  test('shows brand color section with color picker and hex input (AC#6)', async ({ page }) => {
    await expect(page.getByText('צבע המותג', { exact: true })).toBeVisible()
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
    await expect(page.getByText('מטבע החנות')).toBeVisible()
    await expect(page.getByRole('button', { name: 'לא נבחר' })).toBeVisible()
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
    await expect(page.getByText(/ננעל/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'לא נבחר' })).not.toBeVisible()
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
    await page.getByRole('button', { name: 'שמירת השינויים' }).click()
    await expect(page.getByText('ההגדרות נשמרו')).toBeVisible()
    await expect(page.getByText('₪ ILS')).toBeVisible()
    await expect(page.getByRole('button', { name: '₪ ILS' })).not.toBeVisible()
  })

  test('shows validation error when name is cleared and saved (AC#1)', async ({ page }) => {
    await page.getByPlaceholder('קפה הפינה').fill('')
    await page.getByRole('button', { name: 'שמירת השינויים' }).click()
    await expect(page.getByText(/יש להזין שם עסק/)).toBeVisible()
  })
})

// TASK-184 — the `business-assets` storage bucket Settings.tsx's logo upload
// has always targeted never existed, so real uploads silently failed with a
// "Bucket not found" 404 (same class of bug TASK-98 hit for product images
// and TASK-95 for reward images, both fixed by creating their bucket via
// migration). TASK-182 made that failure surface as a visible error instead
// of failing silently; TASK-184's migration (20260719120000, in
// enroll-consumer) creates the bucket itself. Neither prior task added e2e
// coverage of the Settings logo field's upload path specifically (checked:
// no existing spec references `business-assets` or `logoUploadFailed`).
//
// This first test mirrors owner-products.spec.ts's TASK-98 "upload fails"
// test — it mocks the storage endpoint, so it's deterministic and passes
// today regardless of whether the migration has landed.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

test.describe('logo upload error handling (TASK-184, requires owner auth)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page)
    await page.goto('/owner/settings')
  })

  // The admin app doesn't have an `admin.settings.logoUploadFailed` (or
  // `uploadImageAriaLabel`) translation in the installed @vitskyds/enroll-core
  // build yet — i18next's missing-key fallback renders the key itself, so
  // that's the exact string that shows up right now. Asserting on "an error
  // paragraph is present and non-empty" would be more translation-churn-proof,
  // but would also pass even if the app regressed to showing nothing —
  // asserting the real current text catches that case ("logo" is a literal
  // English key fragment so this won't collide with any real Hebrew copy).
  test('surfaces an error and does not save when the logo upload fails (AC#3)', async ({ page }) => {
    await page.route('**/storage/v1/object/business-assets/**', route =>
      route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Bucket not found' }) }),
    )
    await page.locator('input[type=file]').setInputFiles({
      name: 'test.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })
    await page.getByRole('button', { name: 'שמירת השינויים' }).click()
    await expect(page.getByText(/logoUploadFailed/)).toBeVisible()
    await expect(page.getByText('ההגדרות נשמרו')).not.toBeVisible()
  })
})

// TASK-184 AC#2 — "A real (unmocked) logo upload in Settings succeeds
// end-to-end and the logo persists after a page reload." Unlike the test
// above, this hits the real business-assets bucket with no route mocking.
//
// IMPORTANT: this only passes once migration 20260719120000
// (business_assets_bucket.sql, in enroll-consumer) has actually been applied
// to the live Supabase project via `supabase db push` — that's a separate,
// deliberate step requiring the user's explicit go-ahead (doc-13: one shared
// project backs local/preview/prod, no isolated test database). Until then,
// this test is expected to fail the same way production currently does: the
// upload 404s, Settings.tsx's TASK-182 error path kicks in, and the
// "settings saved" toast never appears.
//
// owner@test.com owns exactly one real business (Corner Cup) — there's no
// throwaway business to upload to, so this overwrites that business's live
// logo_url. Snapshots the original value and restores it in a `finally`
// block via direct REST (independent of the browser session), the same
// capture/verify/cleanup pattern owner-onboarding.spec.ts's TASK-125 test
// uses, so re-running this test repeatedly is idempotent and leaves no
// visible trace on the real business record.
test.describe('logo upload against the real business-assets bucket (TASK-184 AC#2)', () => {
  test.skip(!SUPABASE_URL || !ANON_KEY, 'requires .env with Supabase credentials')

  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page)
    await page.goto('/owner/settings')
  })

  test('a real logo upload persists after a page reload', async ({ page, request }) => {
    const signIn = await request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: ANON_KEY!, 'Content-Type': 'application/json' },
      data: { email: 'owner@test.com', password: 'EnrollTest123!' },
    })
    expect(signIn.ok(), 'owner@test.com sign-in should succeed').toBeTruthy()
    const { access_token, user } = await signIn.json()
    const authHeaders = { apikey: ANON_KEY!, Authorization: `Bearer ${access_token}` }

    const bizRes = await request.get(
      `${SUPABASE_URL}/rest/v1/businesses?select=id,logo_url&owner_id=eq.${user.id}`,
      { headers: authHeaders },
    )
    const [biz] = await bizRes.json()
    expect(biz, "owner@test.com's business should exist").toBeTruthy()
    const originalLogoUrl: string | null = biz.logo_url

    try {
      await page.locator('input[type=file]').setInputFiles({
        name: 'e2e-logo.png',
        mimeType: 'image/png',
        buffer: TINY_PNG,
      })
      await page.getByRole('button', { name: 'שמירת השינויים' }).click()

      // Once the bucket exists, save succeeds with the normal toast and no
      // logo error — see the describe block's header comment for why this
      // currently fails until the migration is applied.
      await expect(page.getByText('ההגדרות נשמרו')).toBeVisible()
      await expect(page.getByText(/logoUploadFailed/)).not.toBeVisible()

      await page.reload()
      const logoImg = page.getByAltText('לוגו')
      await expect(logoImg).toBeVisible()
      const src = await logoImg.getAttribute('src')
      expect(src, 'logo src should be a real uploaded URL, not the stale local blob preview').toBeTruthy()
      expect(src).toContain('business-assets')
      expect(src).not.toMatch(/^blob:/)
    } finally {
      const restore = await request.patch(`${SUPABASE_URL}/rest/v1/businesses?id=eq.${biz.id}`, {
        headers: { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        data: { logo_url: originalLogoUrl },
      })
      expect(restore.ok(), 'cleanup restore of logo_url should succeed').toBeTruthy()
    }
  })
})
