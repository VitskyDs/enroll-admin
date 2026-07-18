import { test, expect } from '@playwright/test'
import { signInAsOwner } from './helpers/auth'

// TASK-163 — /owner/activity: a searchable, filterable, paginated list of every
// point transaction across an owner's customers, replacing the dashboard's
// "view all" link that previously (incorrectly) pointed at /owner/customers.
//
// The admin app is Hebrew-only (src/i18n/force-he.ts) and the admin.activity.*
// copy keys added by this task aren't resolved by the @vitskyds/enroll-core
// version currently installed in node_modules (they exist only in that repo's
// uncommitted src/i18n/*.json — not yet built/published), so this page's own
// static copy renders as raw i18n keys in this environment (e.g.
// "admin.activity.title") rather than translated text. Reused copy that comes
// from already-published enroll-core keys (e.g. the customer detail panel's
// "Gift points" heading, or admin.customers.clearFilters) does render
// correctly in Hebrew. To stay meaningful regardless of that i18n gap, these
// tests assert on structure/data (row counts, sign of amounts, href
// attributes, dir attributes) rather than on the page's own untranslated
// copy.

// Auth guard
test('unauthenticated /owner/activity redirects to sign-in', async ({ page }) => {
  await page.goto('/owner/activity')
  await expect(page).toHaveURL('/sign-in')
})

test.describe('dashboard "view all" link (requires owner auth)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page)
    await page.goto('/owner/dashboard')
  })

  test('recent activity card links to /owner/activity, not /owner/customers', async ({ page }) => {
    const link = page.locator('a[href="/owner/activity"]')
    await expect(link).toBeVisible()
  })

  test('clicking the link navigates to /owner/activity', async ({ page }) => {
    await page.locator('a[href="/owner/activity"]').click()
    await expect(page).toHaveURL('/owner/activity')
  })
})

test.describe('activity list (requires owner auth + transactions)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page)
    await page.goto('/owner/activity')
  })

  test('loads and lists transaction rows', async ({ page }) => {
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()
    expect(await rows.count()).toBeGreaterThan(0)
  })

  test('desktop table shows customer, type, amount and date columns', async ({ page }) => {
    await expect(page.locator('table tbody tr').first()).toBeVisible()
    const headerRow = page.locator('table thead tr')
    await expect(headerRow.locator('th')).toHaveCount(4)
  })

  test('search input and type/date filter selects are present', async ({ page }) => {
    await expect(page.locator('input').first()).toBeVisible()
    // First select is the type (all/earned/redeemed) filter, second is the date filter.
    await expect(page.locator('select')).toHaveCount(2)
  })

  test('amount cells are wrapped RTL-safe (dir="ltr")', async ({ page }) => {
    const firstAmount = page.locator('table tbody tr').first().locator('td').nth(2).locator('span')
    await expect(firstAmount).toBeVisible()
    await expect(firstAmount).toHaveAttribute('dir', 'ltr')
  })

  test('row click opens the customer detail panel for that row\'s customer', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first()
    const customerName = (await firstRow.locator('td').first().innerText()).trim().split('\n').pop() ?? ''
    await firstRow.click()

    // "Gift points" section heading — an already-published enroll-core key
    // (admin.customerDetail.giftPoints), so it renders in Hebrew regardless of
    // the admin.activity.* i18n gap noted above. Its presence confirms
    // CustomerDetailPanel mounted for the clicked row.
    await expect(page.getByText('הענקת נקודות').first()).toBeVisible()
    // The panel header repeats the customer's name — confirms the right
    // customer was resolved from the row's customer_id, not just that *a*
    // panel opened.
    await expect(page.getByText(customerName, { exact: false }).first()).toBeVisible()
  })
})

test.describe('activity type filter (requires owner auth + transactions)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page)
    await page.goto('/owner/activity')
    await expect(page.locator('table tbody tr').first()).toBeVisible()
  })

  test('"earned" narrows the list to positive-amount transactions only', async ({ page }) => {
    await page.locator('select').first().selectOption('earned')
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()
    const amounts = await rows.locator('td').nth(2).locator('span').allInnerTexts()
    expect(amounts.length).toBeGreaterThan(0)
    for (const amount of amounts) expect(amount.startsWith('+')).toBe(true)
  })

  test('"redeemed" narrows the list to negative-amount transactions only', async ({ page }) => {
    await page.locator('select').first().selectOption('redeemed')
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible()
    const amounts = await rows.locator('td').nth(2).locator('span').allInnerTexts()
    expect(amounts.length).toBeGreaterThan(0)
    for (const amount of amounts) expect(amount.startsWith('-')).toBe(true)
  })

  test('switching back to "all types" restores both earned and redeemed rows', async ({ page }) => {
    await page.locator('select').first().selectOption('redeemed')
    await expect(page.locator('table tbody tr').first()).toBeVisible()
    const redeemedCount = await page.locator('table tbody tr').count()

    await page.locator('select').first().selectOption('all')
    await expect
      .poll(async () => page.locator('table tbody tr').count())
      .toBeGreaterThan(redeemedCount)
  })
})

test.describe('activity search (requires owner auth + transactions)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page)
    await page.goto('/owner/activity')
    await expect(page.locator('table tbody tr').first()).toBeVisible()
  })

  test('narrows the list to rows for a matching customer name', async ({ page }) => {
    const search = page.locator('input').first()
    const rows = page.locator('table tbody tr')

    await search.fill('Isaac')
    // Debounced (200ms) + async — poll the actual row content rather than just
    // the count, since the pre-filter row count is already > 0 and would make
    // a count-only poll pass on stale (unfiltered) data.
    await expect
      .poll(async () => (await rows.first().locator('td').first().innerText()).toLowerCase(), { timeout: 10_000 })
      .toContain('isaac')

    const names = await rows.locator('td').first().allInnerTexts()
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) expect(name.toLowerCase()).toContain('isaac')
  })

  test('shows the filtered-empty state for a name that matches no customer', async ({ page }) => {
    const search = page.locator('input').first()
    await search.fill('zzz-no-such-customer-xyz')

    await expect(page.locator('table tbody tr')).toHaveCount(0)
    // Reused admin.customers.clearFilters key — already published, renders in Hebrew.
    await expect(page.getByRole('button', { name: 'ניקוי הסינון' })).toBeVisible()
  })

  test('clearing the filter via the empty state\'s clear-filters action restores the list', async ({ page }) => {
    const search = page.locator('input').first()
    await search.fill('zzz-no-such-customer-xyz')
    await expect(page.locator('table tbody tr')).toHaveCount(0)

    await page.getByRole('button', { name: 'ניקוי הסינון' }).click()

    await expect(search).toHaveValue('')
    await expect.poll(async () => page.locator('table tbody tr').count()).toBeGreaterThan(0)
  })
})

test.describe('activity pagination (requires owner auth + >1 page of transactions)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page)
    await page.goto('/owner/activity')
    await expect(page.locator('table tbody tr').first()).toBeVisible()
  })

  test('load more appends additional rows past the first page', async ({ page }) => {
    const loadMoreButton = page.locator('.flex.justify-center.p-4 button')
    test.skip(!(await loadMoreButton.isVisible().catch(() => false)), 'fewer than one page of transactions currently seeded')

    const initialCount = await page.locator('table tbody tr').count()
    await loadMoreButton.click()

    await expect.poll(async () => page.locator('table tbody tr').count()).toBeGreaterThan(initialCount)
  })
})

test.describe('activity mobile layout (requires owner auth + transactions)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page)
    await page.goto('/owner/activity')
  })

  test('renders the mobile card list instead of the desktop table', async ({ page }) => {
    await expect(page.locator('table.hidden.md\\:table')).toBeHidden()
    const cards = page.locator('div.md\\:hidden.space-y-2.p-3 > button')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThan(0)
  })

  test('tapping a card opens the customer detail drawer', async ({ page }) => {
    const cards = page.locator('div.md\\:hidden.space-y-2.p-3 > button')
    await expect(cards.first()).toBeVisible()
    await cards.first().click()
    // Unlike the desktop CustomerDetailPanel (which renders first in the DOM
    // and is the visible one at desktop viewports), at a mobile viewport it's
    // the CustomerDetailDrawer — rendered second — that's actually visible, so
    // this needs .last() rather than the .first() convention used elsewhere.
    await expect(page.getByText('הענקת נקודות').last()).toBeVisible()
  })
})
