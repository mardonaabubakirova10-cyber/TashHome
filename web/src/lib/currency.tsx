import { createContext, useContext, useState, type ReactNode } from 'react'

export type Currency = 'USD' | 'UZS'

// Временный курс; на шаге 2.3 заменим на курс ЦБ с сервера.
const DEFAULT_USD_UZS = 12700

type Ctx = {
  currency: Currency
  setCurrency: (c: Currency) => void
  rate: number
  format: (usd: number) => string
}

const CurrencyContext = createContext<Ctx | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    try {
      return localStorage.getItem('currency') === 'UZS' ? 'UZS' : 'USD'
    } catch {
      return 'USD'
    }
  })
  const rate = DEFAULT_USD_UZS

  const setCurrency = (c: Currency) => {
    setCurrencyState(c)
    try {
      localStorage.setItem('currency', c)
    } catch {
      /* localStorage недоступен */
    }
  }

  const format = (usd: number) =>
    currency === 'USD'
      ? `$${Math.round(usd).toLocaleString('en-US')}`
      : `${Math.round(usd * rate).toLocaleString('ru-RU')} сум`

  return <CurrencyContext value={{ currency, setCurrency, rate, format }}>{children}</CurrencyContext>
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency вне CurrencyProvider')
  return ctx
}
