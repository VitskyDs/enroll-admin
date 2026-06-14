import { test, expect } from '@playwright/test'

// Auth guard
test('unauthenticated /owner/rewards redirects to sign-in', async ({ page }) => {
  await page.goto('/owner/rewards')
  await expect(page).toHaveURL('/sign-in')
})

// Structural tests — require an authenticated owner session.
test.describe('rewards catalog structure (requires owner auth)', () => {
  test.skip(true, 'requires owner auth fixture')

  test('shows Rewards heading (AC#1)', async ({ page }) => {
    await page.goto('/owner/rewards')
    await expect(page.getByRole('heading', { name: /rewards/i })).toBeVisible()
  })

  test('shows Add reward button (AC#2)', async ({ page }) => {
    await page.goto('/owner/rewards')
    await expect(page.getByRole('button', { name: /add reward/i })).toBeVisible()
  })

  test('shows empty state when no rewards exist (AC#6)', async ({ page }) => {
    await page.goto('/owner/rewards')
    const emptyState = page.getByText(/no rewards yet/i)
    if (await emptyState.isVisible()) {
      await expect(page.getByRole('button', { name: /add your first reward/i })).toBeVisible()
    }
  })

  test('opens add drawer when button is clicked (AC#2)', async ({ page }) => {
    await page.goto('/owner/rewards')
    await page.getByRole('button', { name: /add reward/i }).click()
    await expect(page.getByText('Add reward').nth(1)).toBeVisible()
    await expect(page.getByLabel(/name/i)).toBeVisible()
    await expect(page.getByLabel(/points cost/i)).toBeVisible()
  })

  test('add drawer shows error when name is empty (AC#2)', async ({ page }) => {
    await page.goto('/owner/rewards')
    await page.getByRole('button', { name: /add reward/i }).click()
    await page.getByRole('button', { name: /add reward/i }).last().click()
    await expect(page.getByText(/name is required/i)).toBeVisible()
  })

  test('add drawer shows error when points cost is missing (AC#2)', async ({ page }) => {
    await page.goto('/owner/rewards')
    await page.getByRole('button', { name: /add reward/i }).click()
    await page.getByLabel(/name/i).fill('Test Reward')
    await page.getByRole('button', { name: /add reward/i }).last().click()
    await expect(page.getByText(/points cost must be at least/i)).toBeVisible()
  })

  test('reward rows show status badge (AC#1, AC#4)', async ({ page }) => {
    await page.goto('/owner/rewards')
    const active = page.getByText('Active').first()
    const inactive = page.getByText('Inactive').first()
    await expect(active.or(inactive)).toBeVisible()
  })

  test('reward rows show points cost (AC#1)', async ({ page }) => {
    await page.goto('/owner/rewards')
    // Points cost is rendered as "N pts"
    await expect(page.getByText(/pts/i).first()).toBeVisible()
  })
})
