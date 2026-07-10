import { test, expect } from '@playwright/test'
import { signInAsNonOwner } from './helpers/auth'

// TASK-94 regression: an authenticated non-owner used to bounce forever
// between /sign-in and /owner (RequireOwner sends non-owners to /sign-in,
// which then saw a logged-in user and redirected straight back to /owner).
// customer@test.com is an enrolled Corner Cup customer with no business.
test('authenticated non-owner sees the not-an-owner message instead of a redirect loop (TASK-94)', async ({ page }) => {
  await signInAsNonOwner(page)
  await expect(page).toHaveURL('/sign-in')
  await expect(page.getByText("This account isn't an owner on any business")).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
})

// TASK-123: the not-an-owner screen used to be a dead end with no path to
// actually creating a business — "Create a business" opens the onboarding wizard.
test('not-an-owner screen offers a path to create a business (TASK-123)', async ({ page }) => {
  await signInAsNonOwner(page)
  await expect(page).toHaveURL('/sign-in')
  await page.getByRole('button', { name: 'Create a business' }).click()
  await expect(page).toHaveURL('/owner/onboarding')
  await expect(page.getByText(/I'll help you set up your business/i)).toBeVisible()
})
