import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { API_URL } from './estimateApi'

export type Currency = 'USD' | 'UZS'

// Запасной курс на случай, если сервер недоступен; актуальный берём у сервера (курс ЦБ).
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
  const [rate, setRate] = useState(DEFAULT_USD_UZS)
  useEffect(() => {
    fetch(`${API_URL}/currency`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { usd_uzs: number }) => d.usd_uzs > 0 && setRate(d.usd_uzs))
      .catch(() => {})
  }, [])

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
