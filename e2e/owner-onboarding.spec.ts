import { test, expect } from '@playwright/test'

// AC#1: authenticated user with no business → /owner/onboarding
// In dev mode RequireAuth bypasses auth, so /owner/onboarding loads directly.
// RequireOwner (on /owner/dashboard) still redirects unauthenticated → /sign-in (tested in owner-shell.spec.ts).

test('onboarding page loads and shows business name prompt (AC #2)', async ({ page }) => {
  await page.goto('/owner/onboarding')
  await expect(page.getByText(/Hi there/i)).toBeVisible()
  await expect(page.getByPlaceholder(/e\.g\. Corner Cup/i)).toBeVisible()
})

test('submitting business name advances to website URL step (AC #2)', async ({ page }) => {
  await page.goto('/owner/onboarding')
  await page.getByPlaceholder(/e\.g\. Corner Cup/i).fill('My Coffee Shop')
  await page.getByPlaceholder(/e\.g\. Corner Cup/i).press('Enter')
  await expect(page.getByPlaceholder(/https:\/\/yourbusiness\.com/i)).toBeVisible()
})

test('skipping website URL shows three product input options (AC #2)', async ({ page }) => {
  await page.goto('/owner/onboarding')
  await page.getByPlaceholder(/e\.g\. Corner Cup/i).fill('My Coffee Shop')
  await page.getByPlaceholder(/e\.g\. Corner Cup/i).press('Enter')
  // Skip URL
  await page.getByRole('button', { name: /skip/i }).click()
  await expect(page.getByText(/Enter your website URL/i)).toBeVisible()
  await expect(page.getByText(/Upload a file/i)).toBeVisible()
  await expect(page.getByText(/Take a photo/i)).toBeVisible()
})

test('providing a website URL triggers product loading (AC #2)', async ({ page }) => {
  await page.goto('/owner/onboarding')
  await page.getByPlaceholder(/e\.g\. Corner Cup/i).fill('Townhouse')
  await page.getByPlaceholder(/e\.g\. Corner Cup/i).press('Enter')
  await page.getByPlaceholder(/https:\/\/yourbusiness\.com/i).fill('https://townhousebeauty.com')
  await page.getByPlaceholder(/https:\/\/yourbusiness\.com/i).press('Enter')
  await expect(page.getByText(/Scanning for products/i)).toBeVisible()
})

test('start over resets to business name step', async ({ page }) => {
  await page.goto('/owner/onboarding')
  await page.getByPlaceholder(/e\.g\. Corner Cup/i).fill('My Coffee Shop')
  await page.getByPlaceholder(/e\.g\. Corner Cup/i).press('Enter')
  await page.getByRole('button', { name: /start over/i }).click()
  await expect(page.getByPlaceholder(/e\.g\. Corner Cup/i)).toBeVisible()
})

test('continue button on business name is disabled when field is empty (AC #6)', async ({ page }) => {
  await page.goto('/owner/onboarding')
  const input = page.getByPlaceholder(/e\.g\. Corner Cup/i)
  await expect(input).toBeVisible()
  // SVG arrow button is disabled with empty input — verify by attempting submit via Enter
  await input.press('Enter')
  // Should still be on business-name step (website URL input not yet visible)
  await expect(page.getByPlaceholder(/https:\/\/yourbusiness\.com/i)).not.toBeVisible()
})
