import type { EarnRules, RewardTiersConfig, ReferralRules } from '@/types'

export type ExtractedProduct = {
  name: string
  description: string | null
  price_cents: number | null
  category: string | null
}

export type ProgramInput = {
  businessName: string
  goal: 'gain_members' | 'retain_customers' | 'increase_revenue'
  visitFrequency: 'weekly' | 'monthly_2_3' | 'monthly_1'
  rewardType: 'discounts' | 'perks' | 'points' | 'not_sure'
  products: ExtractedProduct[]
}

export type GeneratedProgram = {
  program_name: string
  currency_name: string
  summary: string
  earn_rules: EarnRules
  reward_tiers: RewardTiersConfig
  referral_rules: ReferralRules
  brand_voice: Record<string, unknown>
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// TODO: replace with real Claude API call (vision + text extraction)
export async function extractProductsFromUrl(_url: string): Promise<ExtractedProduct[]> {
  await sleep(1800)
  return [
    { name: 'Classic Manicure', description: 'Shape, buff and polish', price_cents: 3500, category: 'Nails' },
    { name: 'Gel Manicure', description: 'Long-lasting gel colour of your choice', price_cents: 5500, category: 'Nails' },
    { name: 'Pedicure', description: 'Full foot care and polish', price_cents: 4500, category: 'Nails' },
    { name: 'Gel Pedicure', description: 'Gel finish foot treatment', price_cents: 6500, category: 'Nails' },
    { name: 'Brow shaping', description: 'Wax and tidy', price_cents: 2000, category: 'Brows & Lashes' },
    { name: 'Lash tint', description: 'Semi-permanent tint', price_cents: 2500, category: 'Brows & Lashes' },
  ]
}

// TODO: replace with real Claude vision API call
export async function extractProductsFromFile(_file: File): Promise<ExtractedProduct[]> {
  await sleep(2000)
  return [
    { name: 'Espresso', description: 'Double shot', price_cents: 350, category: 'Coffee' },
    { name: 'Latte', description: 'Espresso with steamed milk', price_cents: 500, category: 'Coffee' },
    { name: 'Cappuccino', description: 'Equal parts espresso, milk and foam', price_cents: 480, category: 'Coffee' },
    { name: 'Cold brew', description: '12-hour steep, served over ice', price_cents: 550, category: 'Coffee' },
    { name: 'Croissant', description: 'Butter or almond', price_cents: 400, category: 'Pastries' },
    { name: 'Banana bread', description: 'Warm slice with butter', price_cents: 450, category: 'Pastries' },
  ]
}

// TODO: replace with real Claude API call
export async function generateLoyaltyProgram(input: ProgramInput): Promise<GeneratedProgram> {
  await sleep(2200)

  const goalSummary =
    input.goal === 'gain_members' ? 'attract new customers' :
    input.goal === 'retain_customers' ? 'keep customers coming back' :
    'grow recurring revenue'

  const tiers: RewardTiersConfig['tiers'] =
    input.goal === 'retain_customers'
      ? [
          { name: 'Bronze', min_points: 0, perks: ['5% off every visit'] },
          { name: 'Silver', min_points: 200, perks: ['10% off + priority booking'] },
          { name: 'Gold', min_points: 500, perks: ['15% off + one free item per month'] },
        ]
      : [
          { name: 'Member', min_points: 0, perks: ['Welcome gift on first visit'] },
          { name: 'Regular', min_points: 150, perks: ['Free add-on with any purchase'] },
          { name: 'VIP', min_points: 400, perks: ['20% off everything + exclusive access'] },
        ]

  const referrerPoints = input.visitFrequency === 'weekly' ? 15 : 10
  const currencyName = input.rewardType === 'points' ? 'Stars' : 'Points'

  return {
    program_name: `${input.businessName} Rewards`,
    currency_name: currencyName,
    summary: `A tiered ${currencyName.toLowerCase()} program built to ${goalSummary}.`,
    earn_rules: { points_per_dollar: 1 },
    reward_tiers: { tiers },
    referral_rules: { referrer_points: referrerPoints, referee_points: Math.round(referrerPoints * 0.6) },
    brand_voice: { summary: `Built to help ${input.businessName} grow loyal customers.` },
  }
}
