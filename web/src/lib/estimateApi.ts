export type EstimateInput = {
  district: string
  area_m2: number
  land_sotka: number
  rooms: number
  floors: number
  building_type: string
  renovation: string
  year_built: number
}

export type EstimateResult = {
  predicted_price: number
  price_low: number
  price_high: number
  price_per_m2: number
  factors: Array<{ feature: string; label: string; effect_pct: number }>
}

import { API_URL } from './api'
import { wakeMl } from './wakeMl'

export async function estimate(input: EstimateInput, signal?: AbortSignal): Promise<EstimateResult> {
  const send = () =>
    fetch(`${API_URL}/estimate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
      signal,
    })
  let res = await send()
  if (res.status === 502 || res.status === 503) {
    await wakeMl() // сервис оценки спал: будим и пробуем ещё раз
    res = await send()
  }
  if (!res.ok) throw new Error(`estimate ${res.status}`)
  return res.json()
}
