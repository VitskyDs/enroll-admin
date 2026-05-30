import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { EarnRules } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatEarnRules(rules: EarnRules | null | undefined, currencyName: string): string[] {
  if (!rules) return []
  const base = currencyName.toLowerCase().replace(/s$/, '')
  const pts = (n: number) => `${n} ${n === 1 ? base : `${base}s`}`
  const result: string[] = []
  if (rules.points_per_dollar != null)
    result.push(`Earn ${pts(rules.points_per_dollar)} per $1 spent`)
  if (rules.points_per_visit != null)
    result.push(`Earn ${pts(rules.points_per_visit)} per visit`)
  if (rules.per_product_overrides?.length)
    result.push('Bonus points on select items')
  return result
}
