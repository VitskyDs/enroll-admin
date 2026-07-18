import { test as setup } from '@playwright/test'
import { signInAsOwner } from './helpers/auth'

// TASK-117: signs in once as owner@test.com via the admin app's dev sign-in
// form (see e2e/helpers/auth.ts's signInAsOwner — the same Hebrew-safe
// input[type=...]/form button[type=submit] selectors TASK-163 fixed, reused
// here rather than duplicated) and persists storageState so other specs can
// opt in to a real authenticated owner session instead of signing in fresh
// per test. See playwright.config.ts for how this project wires into the
// rest of the suite and how to use the fixture in a new spec.
const ownerAuthFile = 'e2e/.auth/owner.json'

setup('authenticate as owner@test.com', async ({ page }) => {
  await signInAsOwner(page)
  await page.context().storageState({ path: ownerAuthFile })
})
