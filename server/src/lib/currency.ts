// Курс USD→UZS от Центрального банка Узбекистана с кешем на 6 часов.
const URL = 'https://cbu.uz/ru/arkhiv-kursov-valyut/json/USD/'
const TTL_MS = 6 * 60 * 60 * 1000
const FALLBACK = 12700 // если ЦБ недоступен и кеша ещё нет

type Cached = { rate: number; date: string; fetchedAt: number }
let cache: Cached | null = null

export type Fetcher = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>

export function resetCurrencyCache() {
  cache = null
}

export async function getUsdRate(fetcher: Fetcher = (u) => fetch(u, { signal: AbortSignal.timeout(5000) })) {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return { rate: cache.rate, date: cache.date, source: 'cache' as const }
  try {
    const res = await fetcher(URL)
    if (!res.ok) throw new Error('cbu.uz вернул ошибку')
    const data = (await res.json()) as Array<{ Rate: string; Date: string }>
    const rate = Number(data[0]?.Rate)
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('неожиданный ответ cbu.uz')
    cache = { rate, date: data[0].Date, fetchedAt: Date.now() }
    return { rate, date: cache.date, source: 'cbu.uz' as const }
  } catch (e) {
    console.warn('Курс ЦБ недоступен:', (e as Error).message)
    // устаревший кеш лучше, чем ничего
    if (cache) return { rate: cache.rate, date: cache.date, source: 'stale-cache' as const }
    return { rate: FALLBACK, date: '', source: 'fallback' as const }
  }
}
