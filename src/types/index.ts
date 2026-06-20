export type Business = {
  id: string
  owner_id?: string
  name: string
  slug: string
  logo_url: string | null
  cover_image_url: string | null
  tagline: string | null
  address: string | null
  hours: string | null
  industry: string | null
  brand_color: string | null
  currency: string | null
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
  punch_card_enabled: boolean
  punch_card_target?: number
  punch_card_reward_id?: string | null
}

export type EarnRules = {
  points_per_dollar?: number
  points_per_visit?: number
  birthday_bonus_points?: number
  per_product_overrides?: { product_id: string; points: number }[]
  cents_per_point?: number
}

export type RewardTiersConfig = {
  tiers: { name: string; min_points: number; multiplier?: number; perk?: string; perks: string[] }[]
}

export type ReferralRules = {
  referrer_points: number
  referee_points: number
}

export type Product = {
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

export type CustomerFavorite = {
  id: string
  customer_id: string
  product_id: string
  created_at: string
}

export type Customer = {
  id: string
  user_id: string
  business_id: string
  name: string
  email: string
  points: number
  lifetime_points: number
  punch_card_count: number
  tier: string | null
  joined_at: string
  status: 'active' | 'inactive'
  birthday: string | null
  gender: string | null
  phone: string | null
  marketing_consent: boolean
}

export type Offer = {
  id: string
  business_id: string
  title: string
  description: string | null
  points_bonus: number
  expires_at: string | null
  status: 'active' | 'inactive'
  created_at: string
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

export type Referral = {
  id: string
  referrer_id: string
  referee_id: string | null
  referee_name: string | null
  business_id: string
  status: 'pending' | 'completed'
  points_awarded: number
  created_at: string
}

export type PointTransaction = {
  id: string
  customer_id: string
  business_id: string
  points: number
  reason: string
  created_at: string
}

export type Notification = {
  id: string
  customer_id: string
  title: string
  body: string | null
  read: boolean
  created_at: string
}

export type Order = {
  id: string
  customer_id: string
  business_id: string
  items: unknown
  total_cents: number
  points_awarded: number
  created_at: string
}
