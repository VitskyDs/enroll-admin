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

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-products`
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function callExtractFn(body: Record<string, unknown>): Promise<ExtractedProduct[]> {
  const res = await fetch(EDGE_FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey': ANON_KEY,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`extract-products: ${await res.text()}`)
  const { products } = await res.json()
  return products ?? []
}

export async function extractProductsFromUrl(url: string): Promise<ExtractedProduct[]> {
  return callExtractFn({ url })
}

export async function extractProductsFromFile(file: File): Promise<ExtractedProduct[]> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  return callExtractFn({ file: base64, mimeType: file.type || 'image/jpeg' })
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

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
