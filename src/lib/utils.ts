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
