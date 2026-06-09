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
