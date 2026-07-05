import { test, expect } from '@playwright/test'

// Auth guard — /owner/customers hosts the detail panel
test('unauthenticated /owner/customers redirects to sign-in', async ({ page }) => {
  await page.goto('/owner/customers')
  await expect(page).toHaveURL('/sign-in')
})

// Structural tests — require an authenticated owner session with at least one customer.
test.describe('customer detail panel (requires owner auth + customers)', () => {
  test.skip(true, 'requires owner auth fixture')

  test('clicking a customer row opens the detail panel (AC#8)', async ({ page }) => {
    await page.goto('/owner/customers')
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText('Gift points')).toBeVisible()
  })

  test('panel header shows customer name and points balance (AC#1)', async ({ page }) => {
    await page.goto('/owner/customers')
    await page.locator('table tbody tr').first().click()
    // Panel shows stats strip with "Points" label
    await expect(page.getByText('Points').first()).toBeVisible()
    await expect(page.getByText('Lifetime')).toBeVisible()
    await expect(page.getByText('Joined')).toBeVisible()
  })

  test('panel shows transaction history section (AC#2)', async ({ page }) => {
    await page.goto('/owner/customers')
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText('Transaction history')).toBeVisible()
  })

  // TASK-105 — point_transactions previously had no owner-SELECT RLS policy, so this
  // section always rendered empty for owners regardless of how many transactions existed.
  test('transaction history lists a customer\'s gift entries, not just the header (TASK-105 AC#2)', async ({ page }) => {
    await page.goto('/owner/customers')
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText('Transaction history')).toBeVisible()
    await expect(page.getByText('Gift from owner').first()).toBeVisible()
  })

  test('panel shows referrals section (AC#4)', async ({ page }) => {
    await page.goto('/owner/customers')
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText(/referrals/i)).toBeVisible()
  })

  test('gift points shows error when amount is empty (AC#5)', async ({ page }) => {
    await page.goto('/owner/customers')
    await page.locator('table tbody tr').first().click()
    await page.getByRole('button', { name: 'Gift' }).click()
    await expect(page.getByText(/enter a positive number/i)).toBeVisible()
  })

  // TASK-96 — gift now goes through the gift_points RPC instead of two direct
  // client writes, so a success updates the points balance without an RLS error.
  test('gifting points updates the balance and clears the form (TASK-96 AC#1, #2)', async ({ page }) => {
    await page.goto('/owner/customers')
    await page.locator('table tbody tr').first().click()
    const pointsValue = page.locator('text=Points').locator('xpath=following-sibling::*').first()
    const before = await pointsValue.textContent()

    await page.getByPlaceholder('Amount').fill('5')
    await page.getByRole('button', { name: 'Gift' }).click()

    await expect(page.getByPlaceholder('Amount')).toHaveValue('')
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
    await page.goto('/owner/customers')
    await page.locator('table tbody tr').first().click()
    await page.getByPlaceholder('Amount').fill('5')
    await page.getByRole('button', { name: 'Gift' }).click()
    await expect(page.getByText(/not authorized to gift points/i)).toBeVisible()
  })

  test('panel closes when X is clicked (AC#8)', async ({ page }) => {
    await page.goto('/owner/customers')
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText('Gift points')).toBeVisible()
    // Close button in the panel header
    await page.locator('aside button').first().click()
    await expect(page.getByText('Gift points')).not.toBeVisible()
  })

  // TASK-84 — requires a program with punch_card_enabled = true
  test('panel shows Punch card section with count, target and reward name when enabled (TASK-84 AC#1, #2, #3)', async ({ page }) => {
    await page.goto('/owner/customers')
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText('Punch card', { exact: true })).toBeVisible()
    await expect(page.getByText(/\d+ \/ \d+ punches/)).toBeVisible()
    await expect(page.getByText(/^Reward: /)).toBeVisible()
  })

  // TASK-84 — requires a program with punch_card_enabled = false
  test('panel omits Punch card section when disabled (TASK-84 AC#4)', async ({ page }) => {
    await page.goto('/owner/customers')
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText('Gift points')).toBeVisible()
    await expect(page.getByText('Punch card', { exact: true })).not.toBeVisible()
  })
})
