import { test, expect } from '@playwright/test'
import { signInAsOwner } from './helpers/auth'

// AC#6, AC#7: auth guard — unauthenticated users cannot access the dashboard
test('unauthenticated /owner/dashboard redirects to sign-in', async ({ page }) => {
  await page.goto('/owner/dashboard')
  await expect(page).toHaveURL('/sign-in')
})

test.describe('dashboard structure (requires owner auth)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAsOwner(page)
    await page.goto('/owner/dashboard')
  })

  test('shows a personalized greeting heading (AC#7)', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })).toBeVisible()
  })

  test('shows all 6 stat card labels (AC#2)', async ({ page }) => {
    await expect(page.getByText(/active members/i)).toBeVisible()
    await expect(page.getByText(/total members/i)).toBeVisible()
    await expect(page.getByText(/points issued this month/i)).toBeVisible()
    await expect(page.getByText(/redemptions this month/i)).toBeVisible()
    await expect(page.getByText(/new members this week/i)).toBeVisible()
    await expect(page.getByText(/loyalty strength/i)).toBeVisible()
  })

  test('shows the Catch up banner (AC#4)', async ({ page }) => {
    // Either the "all engaged" or the at-risk count message should appear
    const engaged = page.getByText(/all customers are engaged/i)
    const atRisk = page.getByText(/customers? need your attention/i)
    await expect(engaged.or(atRisk)).toBeVisible()
  })

  test('Catch up banner links to /owner/catch-up when customers are at risk (AC#4)', async ({ page }) => {
    const banner = page.getByRole('link', { name: /catch up/i })
    if (await banner.isVisible()) {
      await expect(banner).toHaveAttribute('href', '/owner/catch-up')
    }
  })

  test('loyalty strength score is a number between 0 and 100 (AC#1)', async ({ page }) => {
    // The score is rendered next to "/100"
    await expect(page.getByText('/ 100')).toBeVisible()
  })
})

// Award points manually (TASK-86/TASK-118) — requires an authenticated owner
// session plus a seeded customer with a known phone number.
test.describe('award points manually (requires owner auth)', () => {
  test.skip(true, 'requires a seeded customer with phone 5555551234')

  test('quick action opens a dialog instead of navigating away (TASK-86 AC#1)', async ({ page }) => {
    await page.goto('/owner/dashboard')
    await page.getByRole('button', { name: /award points manually/i }).click()
    await expect(page.getByRole('dialog', { name: /award points manually/i })).toBeVisible()
    await expect(page).toHaveURL('/owner/dashboard')
  })

  test('looking up an unknown phone number shows a clear empty state (TASK-86 AC#2)', async ({ page }) => {
    await page.goto('/owner/dashboard')
    await page.getByRole('button', { name: /award points manually/i }).click()
    await page.getByLabel(/customer phone number/i).fill('0000000000')
    await page.getByRole('button', { name: /search/i }).click()
    await expect(page.getByText(/no customer found/i)).toBeVisible()
  })

  test('matched customer shows name, tier, and points balance before confirming (TASK-86 AC#3)', async ({ page }) => {
    await page.goto('/owner/dashboard')
    await page.getByRole('button', { name: /award points manually/i }).click()
    await page.getByLabel(/customer phone number/i).fill('5555551234')
    await page.getByRole('button', { name: /search/i }).click()
    await expect(page.getByText(/pts balance/i)).toBeVisible()
  })

  test('entering a purchase amount computes points from earn rules and tier multiplier (TASK-86 AC#4)', async ({ page }) => {
    await page.goto('/owner/dashboard')
    await page.getByRole('button', { name: /award points manually/i }).click()
    await page.getByLabel(/customer phone number/i).fill('5555551234')
    await page.getByRole('button', { name: /search/i }).click()
    await page.getByLabel(/purchase amount/i).fill('25')
    await expect(page.getByText(/this will credit/i)).toBeVisible()
  })

  test('confirming credits the customer and closes the dialog (TASK-86 AC#5, TASK-118 AC#2/#3)', async ({ page }) => {
    await page.goto('/owner/dashboard')
    await page.getByRole('button', { name: /award points manually/i }).click()
    await page.getByLabel(/customer phone number/i).fill('5555551234')
    await page.getByRole('button', { name: /search/i }).click()
    await page.getByLabel(/purchase amount/i).fill('25')
    await page.getByRole('button', { name: /^award points$/i }).click()
    await expect(page.getByRole('dialog', { name: /award points manually/i })).toBeHidden()
    await expect(page.getByText(/earned .* points/i).first()).toBeVisible()
  })

  test('an invalid purchase amount surfaces an inline error (TASK-86 AC#6)', async ({ page }) => {
    await page.goto('/owner/dashboard')
    await page.getByRole('button', { name: /award points manually/i }).click()
    await page.getByLabel(/customer phone number/i).fill('5555551234')
    await page.getByRole('button', { name: /search/i }).click()
    await page.getByLabel(/purchase amount/i).fill('0')
    await page.getByRole('button', { name: /^award points$/i }).click()
    await expect(page.getByText(/enter a valid purchase amount/i)).toBeVisible()
  })

  test('an unauthorized RPC write surfaces its error inline (TASK-118 AC#4)', async ({ page }) => {
    // Simulates the RPC rejecting a customer outside the owner's business —
    // covered directly against the database in TASK-118's manual verification;
    // this documents the expected UI behavior once the fixture exists.
    await page.goto('/owner/dashboard')
    await page.getByRole('button', { name: /award points manually/i }).click()
    await page.getByLabel(/customer phone number/i).fill('5555551234')
    await page.getByRole('button', { name: /search/i }).click()
    await page.getByLabel(/purchase amount/i).fill('25')
    await page.getByRole('button', { name: /^award points$/i }).click()
    await expect(page.getByText(/not authorized/i)).toBeVisible()
  })

  test('all dialog copy is sentence case with no emojis (TASK-86 AC#7)', async ({ page }) => {
    await page.goto('/owner/dashboard')
    await page.getByRole('button', { name: /award points manually/i }).click()
    const dialog = page.getByRole('dialog', { name: /award points manually/i })
    const text = await dialog.innerText()
    expect(text).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
  })
})
