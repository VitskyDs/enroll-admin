import { defineConfig, devices } from '@playwright/test'

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
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
