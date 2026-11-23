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

// Пока нет backend, обращаемся к ml-сервису напрямую. На шаге 4.5 заменим на /api/estimate.
const ML_URL = import.meta.env.VITE_ML_URL ?? 'http://localhost:8001'

export async function estimate(input: EstimateInput, signal?: AbortSignal): Promise<EstimateResult> {
  const res = await fetch(`${ML_URL}/predict`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  })
  if (!res.ok) throw new Error(`estimate ${res.status}`)
  return res.json()
}
