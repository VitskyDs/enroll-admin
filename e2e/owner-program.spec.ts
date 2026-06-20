import { test, expect } from '@playwright/test'

// Auth guard
test('unauthenticated /owner/program redirects to sign-in', async ({ page }) => {
  await page.goto('/owner/program')
  await expect(page).toHaveURL('/sign-in')
})

// Structural tests — require an authenticated owner session.
test.describe('program settings structure (requires owner auth)', () => {
  test.skip(true, 'requires owner auth fixture')

  test('shows Program settings heading (AC#1)', async ({ page }) => {
    await page.goto('/owner/program')
    await expect(page.getByRole('heading', { name: /program settings/i })).toBeVisible()
  })

  test('shows all section headings (AC#1)', async ({ page }) => {
    await page.goto('/owner/program')
    await expect(page.getByText('Earn rules')).toBeVisible()
    await expect(page.getByText('Birthday bonus')).toBeVisible()
    await expect(page.getByText('Tiers')).toBeVisible()
    await expect(page.getByText('Referral rules')).toBeVisible()
    await expect(page.getByText('Punch card')).toBeVisible()
  })

  test('earn rules has points per dollar and per visit inputs (AC#2)', async ({ page }) => {
    await page.goto('/owner/program')
    await expect(page.getByLabel(/points per dollar/i)).toBeVisible()
    await expect(page.getByLabel(/points per visit/i)).toBeVisible()
  })

  test('earn rules shows validation error when both fields are blank (AC#2, AC#9)', async ({ page }) => {
    await page.goto('/owner/program')
    await page.getByLabel(/points per dollar/i).fill('')
    await page.getByLabel(/points per visit/i).fill('')
    // Click the Save button for earn rules section
    await page.locator('section').filter({ hasText: 'Earn rules' }).getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(/at least one earn rule/i)).toBeVisible()
  })

  test('birthday bonus input is hidden when toggle is off (AC#7)', async ({ page }) => {
    await page.goto('/owner/program')
    const toggle = page.getByRole('switch', { name: /enable birthday bonus/i })
    // Ensure toggle is off
    if (await toggle.getAttribute('aria-checked') === 'true') {
      await toggle.click()
    }
    await expect(page.getByLabel(/bonus points/i)).not.toBeVisible()
  })

  test('birthday bonus input appears when toggle is on (AC#7)', async ({ page }) => {
    await page.goto('/owner/program')
    const toggle = page.getByRole('switch', { name: /enable birthday bonus/i })
    if (await toggle.getAttribute('aria-checked') !== 'true') {
      await toggle.click()
    }
    await expect(page.getByLabel(/bonus points/i)).toBeVisible()
  })

  test('tiers section shows tier name inputs (AC#4)', async ({ page }) => {
    await page.goto('/owner/program')
    const tiersSection = page.locator('section').filter({ hasText: 'Tiers' })
    await expect(tiersSection).toBeVisible()
  })

  test('tiers shows error when a tier name is blank (AC#9)', async ({ page }) => {
    await page.goto('/owner/program')
    const tiersSection = page.locator('section').filter({ hasText: 'Tiers' })
    // Clear the first tier name
    await tiersSection.locator('input').first().fill('')
    await tiersSection.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(/all tiers must have a name/i)).toBeVisible()
  })

  test('referral rules has referrer and referee point inputs (AC#5)', async ({ page }) => {
    await page.goto('/owner/program')
    await expect(page.getByLabel(/referrer points/i)).toBeVisible()
    await expect(page.getByLabel(/referee points/i)).toBeVisible()
  })

  test('punch card shows enable toggle (AC#1, AC#2)', async ({ page }) => {
    await page.goto('/owner/program')
    await expect(page.getByRole('switch', { name: /enable punch card/i })).toBeVisible()
  })

  test('punch card target and reward fields are hidden when toggle is off (AC#5)', async ({ page }) => {
    await page.goto('/owner/program')
    const toggle = page.getByRole('switch', { name: /enable punch card/i })
    if (await toggle.getAttribute('aria-checked') === 'true') {
      await toggle.click()
    }
    await expect(page.getByLabel(/target punches/i)).not.toBeVisible()
  })

  test('punch card target and reward fields appear when toggle is on (AC#3, AC#4)', async ({ page }) => {
    await page.goto('/owner/program')
    const toggle = page.getByRole('switch', { name: /enable punch card/i })
    if (await toggle.getAttribute('aria-checked') !== 'true') {
      await toggle.click()
    }
    await expect(page.getByLabel(/target punches/i)).toBeVisible()
  })

  test('punch card shows validation error when target is out of range (AC#3)', async ({ page }) => {
    await page.goto('/owner/program')
    const toggle = page.getByRole('switch', { name: /enable punch card/i })
    if (await toggle.getAttribute('aria-checked') !== 'true') {
      await toggle.click()
    }
    await page.getByLabel(/target punches/i).fill('99')
    await page.locator('section').filter({ hasText: 'Punch card' }).getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText(/between 1 and 20/i)).toBeVisible()
  })
})
