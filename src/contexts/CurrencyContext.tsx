import { createContext, useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useBusiness } from '@/hooks/useBusiness'
import type { Currency } from '@/lib/utils'

export { type Currency }
export const CURRENCY_STORAGE_KEY = 'enroll-currency'

interface CurrencyContextValue {
  currency: Currency
  setCurrency: (c: Currency) => void
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'usd',
  setCurrency: () => {},
})

function readOverride(): Currency | null {
  const stored = localStorage.getItem(CURRENCY_STORAGE_KEY)
  return stored === 'ils' || stored === 'usd' ? stored : null
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const { business } = useBusiness()
  const { i18n } = useTranslation()
  // A manual choice in Profile overrides; otherwise the active business decides.
  const [override, setOverride] = useState<Currency | null>(readOverride)

  const businessCurrency: Currency =
    business?.currency === 'ils' ? 'ils' :
    business?.currency === 'usd' ? 'usd' :
    i18n.language === 'he' ? 'ils' : 'usd'
  const currency = override ?? businessCurrency

  function setCurrency(next: Currency) {
    setOverride(next)
    localStorage.setItem(CURRENCY_STORAGE_KEY, next)
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  return useContext(CurrencyContext)
}
