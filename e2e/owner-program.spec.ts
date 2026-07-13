import { test, expect } from '@playwright/test'
import { signInAsOwner } from './helpers/auth'

// Auth guard
test('unauthenticated /owner/program redirects to sign-in', async ({ page }) => {
  await page.goto('/owner/program')
  await expect(page).toHaveURL('/sign-in')
})

// Structural tests — require an authenticated owner session.
test.describe('loyalty program view structure (requires owner auth)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page)
    await page.goto('/owner/program')
  })

  test('shows Loyalty program heading (AC#2)', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /loyalty program/i })).toBeVisible()
  })

  test('shows all section headings (AC#1)', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Earn rules' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Birthday bonus' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tiers' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Referral rules' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Punch card' })).toBeVisible()
  })

  // TASK-138.2 — the punch card section now has an editable reward picker
  // (Save button + inputs), so these read-only assertions are scoped to the
  // other sections, which are unaffected.
  test('other sections remain read-only, with no Save buttons (AC#1)', async ({ page }) => {
    for (const heading of ['Earn rules', 'Birthday bonus', 'Tiers', 'Referral rules']) {
      const section = page.locator('section').filter({ hasText: heading })
      await expect(section.getByRole('button', { name: 'Save' })).toHaveCount(0)
    }
  })

  test('other sections render no editable inputs (AC#1)', async ({ page }) => {
    for (const heading of ['Earn rules', 'Birthday bonus', 'Tiers', 'Referral rules']) {
      const section = page.locator('section').filter({ hasText: heading })
      await expect(section.locator('input')).toHaveCount(0)
    }
  })

  test('shows an Edit entry point (AC#3)', async ({ page }) => {
    await expect(page.getByRole('button', { name: /edit/i })).toBeVisible()
  })

  test('earn rules displays points per dollar and per visit values (AC#1)', async ({ page }) => {
    await expect(page.getByText('Points per dollar')).toBeVisible()
    await expect(page.getByText('Points per visit')).toBeVisible()
  })

  test('tiers section displays configured tiers (AC#1)', async ({ page }) => {
    const tiersSection = page.locator('section').filter({ hasText: 'Tiers' })
    await expect(tiersSection).toBeVisible()
  })

  test('referral rules displays referrer and referee point values (AC#1)', async ({ page }) => {
    await expect(page.getByText('Referrer points')).toBeVisible()
    await expect(page.getByText('Referee points')).toBeVisible()
  })

  test('punch card displays enabled/disabled status (AC#1)', async ({ page }) => {
    const punchSection = page.locator('section').filter({ hasText: 'Punch card' })
    await expect(punchSection.getByText(/enabled|disabled/i)).toBeVisible()
  })
})

// TASK-138.2 — punch card reward config (specific products or a category).
// Skips gracefully when the signed-in business has punch cards disabled, or
// has no active products/categories to pick from, since this suite runs
// against the shared dev+prod Supabase project rather than fixture data.
test.describe('punch card reward configuration (requires owner auth)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page)
    await page.goto('/owner/program')
  })

  async function punchCardEnabled(page: import('@playwright/test').Page) {
    const section = page.locator('section').filter({ hasText: 'Punch card' })
    try {
      await expect(section.getByText(/enabled|disabled/i)).toBeVisible()
    } catch {
      return false
    }
    return section.getByText('Enabled', { exact: true }).isVisible()
  }

  test('shows a mode switch and a save button (AC#1)', async ({ page }) => {
    test.skip(!(await punchCardEnabled(page)), 'punch cards disabled for this business')
    const punchSection = page.locator('section').filter({ hasText: 'Punch card' })
    await expect(punchSection.getByRole('button', { name: 'Specific products' })).toBeVisible()
    await expect(punchSection.getByRole('button', { name: 'Category', exact: true })).toBeVisible()
    await expect(punchSection.getByRole('button', { name: /save reward/i })).toBeVisible()
  })

  test('selecting one or more specific products and saving persists the reward (AC#2, AC#5)', async ({ page }) => {
    test.skip(!(await punchCardEnabled(page)), 'punch cards disabled for this business')
    const punchSection = page.locator('section').filter({ hasText: 'Punch card' })
    await punchSection.getByRole('button', { name: 'Specific products' }).click()

    const checkboxes = punchSection.locator('input[type=checkbox]')
    test.skip((await checkboxes.count()) === 0, 'no active products for this business')

    await checkboxes.first().check()
    if (await checkboxes.count() > 1) await checkboxes.nth(1).check()

    await punchSection.getByRole('button', { name: /save reward/i }).click()
    await expect(page.getByText('Punch card reward saved')).toBeVisible()
    await expect(checkboxes.first()).toBeChecked()
  })

  test('selecting a category and saving persists the reward (AC#3, AC#5)', async ({ page }) => {
    test.skip(!(await punchCardEnabled(page)), 'punch cards disabled for this business')
    const punchSection = page.locator('section').filter({ hasText: 'Punch card' })
    await punchSection.getByRole('button', { name: 'Category', exact: true }).click()

    const select = punchSection.locator('select')
    const optionCount = await select.locator('option').count()
    test.skip(optionCount <= 1, 'no product categories for this business')

    await select.selectOption({ index: 1 })
    await punchSection.getByRole('button', { name: /save reward/i }).click()
    await expect(page.getByText('Punch card reward saved')).toBeVisible()
  })

  test('switching between specific-product and category mode swaps the picker (AC#1)', async ({ page }) => {
    test.skip(!(await punchCardEnabled(page)), 'punch cards disabled for this business')
    const punchSection = page.locator('section').filter({ hasText: 'Punch card' })

    await punchSection.getByRole('button', { name: 'Category', exact: true }).click()
    await expect(punchSection.locator('select')).toBeVisible()
    await expect(punchSection.locator('input[type=checkbox]')).toHaveCount(0)

    await punchSection.getByRole('button', { name: 'Specific products' }).click()
    await expect(punchSection.locator('select')).toHaveCount(0)
  })

  test('a category with no active products shows an inline warning (AC#4)', async ({ page }) => {
    test.skip(!(await punchCardEnabled(page)), 'punch cards disabled for this business')
    const punchSection = page.locator('section').filter({ hasText: 'Punch card' })
    await punchSection.getByRole('button', { name: 'Category', exact: true }).click()

    const select = punchSection.locator('select')
    const optionCount = await select.locator('option').count()
    test.skip(optionCount <= 1, 'no product categories for this business')

    // Every option in the picker is drawn from active products, so this
    // suite can only exercise the warning by injecting a value the UI
    // wouldn't offer on its own — closest thing to a stale/removed category.
    await select.evaluate((el: HTMLSelectElement) => {
      const opt = document.createElement('option')
      opt.value = '__e2e-empty-category__'
      opt.textContent = '__e2e-empty-category__'
      el.appendChild(opt)
      el.value = '__e2e-empty-category__'
      el.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await expect(punchSection.getByText(/no active products/i)).toBeVisible()
  })
})
