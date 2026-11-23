/**
 * Считает оценку модели для домов на продажу и записывает predicted_price_usd и price_label в Supabase (шаг 4.5).
 * Нужен запущенный ml-сервис (ML_SERVICE_URL). Запуск: npx tsx scripts/score-properties.ts
 * Метка: цена ниже оценки больше чем на 10 % — «below», выше больше чем на 10 % — «above», иначе «fair».
 */
import { config } from '../src/config.js'

const base = `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1`
const headers = {
  apikey: config.supabaseKey,
  Authorization: `Bearer ${config.supabaseKey}`,
  'content-type': 'application/json',
  'user-agent': 'tashhome-score/1.0',
}

type Row = { id: number; district_id: string; area_m2: number; land_sotka: number; rooms: number; floors: number; building_type: string; renovation: string; year_built: number; price_usd: number }

export const labelFor = (price: number, predicted: number) => {
  const dev = (price - predicted) / predicted
  return dev < -0.1 ? 'below' : dev > 0.1 ? 'above' : 'fair'
}

const res = await fetch(`${base}/properties?select=*&deal_type=eq.sale&status=eq.active&order=id.asc`, { headers })
if (!res.ok) throw new Error(`Supabase ${res.status}`)
const rows = (await res.json()) as Row[]

let done = 0
for (const r of rows) {
  const p = await fetch(`${config.mlUrl}/predict`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      district: r.district_id, area_m2: Number(r.area_m2), land_sotka: Number(r.land_sotka), rooms: r.rooms, floors: r.floors,
      building_type: r.building_type, renovation: r.renovation, year_built: r.year_built,
    }),
  })
  if (!p.ok) throw new Error(`ML ${p.status} для дома ${r.id}: ${await p.text()}`)
  const predicted = Math.round(((await p.json()) as { predicted_price: number }).predicted_price / 100) * 100
  const upd = await fetch(`${base}/properties?id=eq.${r.id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ predicted_price_usd: predicted, price_label: labelFor(Number(r.price_usd), predicted) }),
  })
  if (!upd.ok) throw new Error(`Supabase ${upd.status} при обновлении дома ${r.id}`)
  done++
}
console.log(`Оценено домов: ${done}`)
