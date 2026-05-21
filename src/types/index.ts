export type Business = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  cover_image_url: string | null
  tagline: string | null
  address: string | null
  hours: string | null
  industry: string | null
  brand_color: string | null
}

export type LoyaltyProgram = {
  id: string
  business_id: string
  program_name: string
  currency_name: string
  earn_rules: EarnRules
  reward_tiers: RewardTiersConfig
  referral_rules: ReferralRules
  brand_voice: Record<string, unknown>
}

export type EarnRules = {
  points_per_dollar?: number
  points_per_visit?: number
  per_service_overrides?: { service_id: string; points: number }[]
}

export type RewardTiersConfig = {
  tiers: { name: string; min_points: number; perks: string[] }[]
}

export type ReferralRules = {
  referrer_points: number
  referee_points: number
}

export type Service = {
  id: string
  business_id: string
  name: string
  description: string | null
  price_cents: number | null
  category: string | null
  status: 'active' | 'draft' | 'inactive'
  image_url: string | null
  points_value: number | null
}

export type Customer = {
  id: string
  user_id: string
  business_id: string
  name: string
  email: string
  points: number
  lifetime_points: number
  tier: string | null
  joined_at: string
  status: 'active' | 'inactive'
  birthday: string | null
}

export type Reward = {
  id: string
  business_id: string
  name: string
  description: string | null
  points_cost: number
  image_url: string | null
  status: 'active' | 'inactive'
}

export type PointTransaction = {
  id: string
  customer_id: string
  business_id: string
  points: number
  reason: string
  created_at: string
}
