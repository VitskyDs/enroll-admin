import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { EarnRules } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type EarnRuleDescriptor = { key: string; count?: number }

export function formatEarnRules(rules: EarnRules | null | undefined): EarnRuleDescriptor[] {
  if (!rules) return []
  const result: EarnRuleDescriptor[] = []
  if (rules.points_per_dollar != null)
    result.push({ key: 'earnRules.perDollar', count: rules.points_per_dollar })
  if (rules.points_per_visit != null)
    result.push({ key: 'earnRules.perVisit', count: rules.points_per_visit })
  if (rules.per_product_overrides?.length)
    result.push({ key: 'earnRules.bonusSelect' })
  return result
}

export function localeFor(lang: string): string {
  return lang === 'he' ? 'he-IL' : 'en-US'
}

export type Currency = 'usd' | 'ils'

function toCurrencyCode(currency: Currency): string {
  return currency === 'ils' ? 'ILS' : 'USD'
}

export function formatPrice(cents: number, currency: Currency, lang: string): string {
  return new Intl.NumberFormat(localeFor(lang), {
    style: 'currency',
    currency: toCurrencyCode(currency),
  }).format(cents / 100)
}

export function formatCurrencyUnit(currency: Currency, lang: string): string {
  return new Intl.NumberFormat(localeFor(lang), {
    style: 'currency',
    currency: toCurrencyCode(currency),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(1)
}

// Caps a redeem against the order total: the discount can never exceed the
// order cost, and the points actually spent are derived from that capped
// discount (not the customer's raw balance) so redemption never overshoots
// what the order needs.
export function getRedemption(
  redeemablePoints: number,
  centsPerPoint: number,
  totalCents: number
): { discountCents: number; redeemedPoints: number } {
  const discountCents = Math.min(redeemablePoints * centsPerPoint, totalCents)
  const redeemedPoints = centsPerPoint > 0 ? Math.ceil(discountCents / centsPerPoint) : 0
  return { discountCents, redeemedPoints }
}

// Customer-facing order number: a stable, digits-only code derived from the
// order UUID (UUIDs are hex, which would otherwise show letters).
export function orderNumber(orderId: string): string {
  let hash = 0
  for (let i = 0; i < orderId.length; i++) {
    hash = (hash * 31 + orderId.charCodeAt(i)) >>> 0
  }
  return String(hash % 100_000_000).padStart(8, '0')
}
