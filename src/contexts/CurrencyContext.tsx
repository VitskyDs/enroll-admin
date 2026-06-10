import { createContext, useContext, useState } from 'react'
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

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const stored = localStorage.getItem(CURRENCY_STORAGE_KEY)
  const storedLang = localStorage.getItem('enroll-lang')
  const initial: Currency =
    stored === 'ils' ? 'ils' :
    stored === 'usd' ? 'usd' :
    storedLang === 'he' ? 'ils' : 'usd'
  const [currency, setCurrencyState] = useState<Currency>(initial)

  function setCurrency(next: Currency) {
    setCurrencyState(next)
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
