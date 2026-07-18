import { defineConfig, devices } from '@playwright/test'

// TASK-117: authenticated specs.
// The `setup` project below (e2e/auth.setup.ts) signs in once as
// owner@test.com via the same helper owner-*.spec.ts files already use
// (e2e/helpers/auth.ts's signInAsOwner) and persists the session to
// e2e/.auth/owner.json (gitignored — never commit storageState files or
// credentials). The `chromium` project depends on `setup`, so that file
// always exists before any spec runs, but no test is authenticated by
// default — the "unauthenticated redirects to sign-in" guard tests rely on
// that.
//
// To add a new authenticated spec, opt in explicitly:
//   test.use({ storageState: 'e2e/.auth/owner.json' })
// at the top of the file, or inside a `test.describe` block to scope it to
// just those tests — see e2e/owner-rewards.spec.ts's "rewards catalog
// structure" describe block for an example (it replaced its old per-test
// signInAsOwner() call in beforeEach with this fixture). Most owner-*.spec.ts
// files still call signInAsOwner(page) directly in beforeEach, which remains
// a valid pattern (a fresh sign-in per test) — the storageState fixture is
// an alternative for specs that don't need a brand-new session each time.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  // Owner specs sign in fresh per test; under a fully parallel run that bursts
  // many concurrent Supabase auth calls, so the default 30s test timeout is
  // occasionally too tight for the auth helper's own retry loop to land.
  timeout: 45_000,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    headless: true,
    actionTimeout: 15_000,
  },
  expect: {
    timeout: 15_000,
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', dependencies: ['setup'] },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
