import { test, expect } from '@playwright/test'
import { signInAsOwner } from './helpers/auth'

// Auth guard — /owner/customers hosts the detail panel
test('unauthenticated /owner/customers redirects to sign-in', async ({ page }) => {
  await page.goto('/owner/customers')
  await expect(page).toHaveURL('/sign-in')
})

// Structural tests — require an authenticated owner session with at least one customer.
// The panel content is rendered twice (CustomerDetailPanel for desktop,
// CustomerDetailDrawer for mobile) — both mount whenever a customer is selected,
// one hidden via CSS depending on viewport. Text/placeholder locators (unlike
// role-based ones) don't exclude the hidden copy, so every match here needs
// .first() to target the visible desktop panel, which renders first in the DOM.
test.describe('customer detail panel (requires owner auth + customers)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page)
    await page.goto('/owner/customers')
  })

  test('clicking a customer row opens the detail panel (AC#8)', async ({ page }) => {
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText('Gift points').first()).toBeVisible()
  })

  test('panel header shows customer name and points balance (AC#1)', async ({ page }) => {
    await page.locator('table tbody tr').first().click()
    // Panel shows stats strip with "Points" label
    await expect(page.getByText('Points').first()).toBeVisible()
    await expect(page.getByText('Lifetime').first()).toBeVisible()
    await expect(page.getByText('Joined').first()).toBeVisible()
  })

  test('panel shows transaction history section (AC#2)', async ({ page }) => {
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText('Transaction history').first()).toBeVisible()
  })

  // TASK-105 — point_transactions previously had no owner-SELECT RLS policy, so this
  // section always rendered empty for owners regardless of how many transactions existed.
  test('transaction history lists a customer\'s gift entries, not just the header (TASK-105 AC#2)', async ({ page }) => {
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText('Transaction history').first()).toBeVisible()
    await expect(page.getByText('Gift from owner').first()).toBeVisible()
  })

  test('panel shows referrals section (AC#4)', async ({ page }) => {
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText(/referrals/i).first()).toBeVisible()
  })

  test('gift points shows error when amount is empty (AC#5)', async ({ page }) => {
    await page.locator('table tbody tr').first().click()
    await page.getByRole('button', { name: 'Gift' }).click()
    await expect(page.getByText(/enter a positive number/i).first()).toBeVisible()
  })

  // TASK-96 — gift now goes through the gift_points RPC instead of two direct
  // client writes, so a success updates the points balance without an RLS error.
  test('gifting points updates the balance and clears the form (TASK-96 AC#1, #2)', async ({ page }) => {
    await page.locator('table tbody tr').first().click()
    // nth(0) is the customers table's "Points" column header; nth(1) is the
    // desktop panel's stat label (nth(2) would be the hidden mobile duplicate).
    const pointsValue = page.getByText('Points', { exact: true }).nth(1).locator('xpath=following-sibling::*').first()
    const before = await pointsValue.textContent()

    await page.getByPlaceholder('Amount').first().fill('5')
    await page.getByRole('button', { name: 'Gift' }).click()

    await expect(page.getByPlaceholder('Amount').first()).toHaveValue('')
    await expect(pointsValue).not.toHaveText(before ?? '')
  })

  // TASK-96 AC#3 — the gift_points RPC rejects a customer the owner doesn't own;
  // surfaced to the UI as the giftError message rather than a silent failure.
  test('gifting points surfaces an authorization error from the RPC (TASK-96 AC#3)', async ({ page }) => {
    await page.route('**/rest/v1/rpc/gift_points', route =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Not authorized to gift points to this customer' }),
      }),
    )
    await page.locator('table tbody tr').first().click()
    await page.getByPlaceholder('Amount').first().fill('5')
    await page.getByRole('button', { name: 'Gift' }).click()
    await expect(page.getByText(/not authorized to gift points/i).first()).toBeVisible()
  })

  // The close button has no aria-label — `aside button` matched the owner layout's
  // sidebar (also an <aside>), not the panel (a plain <div>, not an <aside>). The
  // panel's close X is the last empty-accessible-name button on the page.
  test('panel closes when X is clicked (AC#8)', async ({ page }) => {
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText('Gift points').first()).toBeVisible()
    await page.getByRole('button', { name: '', exact: true }).last().click()
    await expect(page.getByText('Gift points').first()).not.toBeVisible()
  })

  test.describe('punch card enabled', () => {
    // TASK-84 — requires a program with punch_card_enabled = true
    test.skip(true, 'requires a program with punch_card_enabled = true')

    test('panel shows Punch card section with count, target and reward name when enabled (TASK-84 AC#1, #2, #3)', async ({ page }) => {
      await page.locator('table tbody tr').first().click()
      await expect(page.getByText('Punch card', { exact: true }).first()).toBeVisible()
      await expect(page.getByText(/\d+ \/ \d+ punches/).first()).toBeVisible()
      await expect(page.getByText(/^Reward: /).first()).toBeVisible()
    })
  })
})

// The live Corner Cup program currently has punch cards disabled, so this is
// exercised for real against actual data (not skipped).
test.describe('customer detail panel — punch card disabled (requires owner auth + customers)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page)
    await page.goto('/owner/customers')
  })

  // TASK-84 — requires a program with punch_card_enabled = false
  test('panel omits Punch card section when disabled (TASK-84 AC#4)', async ({ page }) => {
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText('Gift points').first()).toBeVisible()
    await expect(page.getByText('Punch card', { exact: true })).not.toBeVisible()
  })
})
