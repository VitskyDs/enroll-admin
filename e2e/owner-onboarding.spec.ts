import { test, expect } from '@playwright/test'

test.describe('owner onboarding', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/owner/onboarding')
  })

  test('shows the opening greeting and business name input', async ({ page }) => {
    await expect(page.getByText(/I'll help you set up your business/i)).toBeVisible()
    await expect(page.getByPlaceholder(/Corner Cup/i)).toBeVisible()
  })

  test('advances to website step after entering business name', async ({ page }) => {
    await page.getByPlaceholder(/Corner Cup/i).fill('Test Biz')
    await page.getByPlaceholder(/Corner Cup/i).press('Enter')
    await expect(page.getByText(/what's your website/i)).toBeVisible()
  })

  test('shows product input options when website is skipped', async ({ page }) => {
    await page.getByPlaceholder(/Corner Cup/i).fill('Test Biz')
    await page.getByPlaceholder(/Corner Cup/i).press('Enter')
    await expect(page.getByText(/what's your website/i)).toBeVisible()
    await page.getByRole('button', { name: /skip/i }).click()
    await expect(page.getByText(/how would you like to share/i)).toBeVisible()
  })

  test('resets the flow when start over is clicked', async ({ page }) => {
    await page.getByPlaceholder(/Corner Cup/i).fill('Test Biz')
    await page.getByPlaceholder(/Corner Cup/i).press('Enter')
    await expect(page.getByText(/what's your website/i)).toBeVisible()
    await page.getByRole('button', { name: /start over/i }).click()
    await expect(page.getByPlaceholder(/Corner Cup/i)).toBeVisible()
    await expect(page.getByText(/what's your website/i)).not.toBeVisible()
  })

  test('empty business name does not advance', async ({ page }) => {
    await expect(page.getByPlaceholder(/Corner Cup/i)).toBeVisible()
    await page.getByPlaceholder(/Corner Cup/i).press('Enter')
    await expect(page.getByText(/what's your website/i)).not.toBeVisible()
  })
})
