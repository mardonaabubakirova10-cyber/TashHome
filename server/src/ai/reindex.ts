import type { Store } from '../lib/store.js'
import { labelFor } from '../lib/adminProperty.js'
import { propertySearchText } from './propertyText.js'

export type ReindexDeps = {
  estimate: (params: Record<string, unknown>) => Promise<unknown>
  embedDocument: (text: string) => Promise<number[]>
}

/**
 * После сохранения дома в админке пересчитывает метку цены (оценка ml-сервиса) и вектор для поиска по смыслу.
 * Ошибки ИИ и ml-сервиса не мешают: дом уже сохранён, пересчёт можно повторить командами props:score и props:embed.
 */
export async function reindexProperty(store: Store, deps: ReindexDeps, id: number): Promise<void> {
  const p = await store.adminGetProperty(id)
  if (!p) return

  if (p.deal_type === 'sale') {
    try {
      const r = (await deps.estimate({
        district: p.district_id, area_m2: p.area_m2, land_sotka: p.land_sotka, rooms: p.rooms, floors: Math.min(p.floors, 5),
        building_type: p.building_type, renovation: p.renovation, year_built: p.year_built ?? 2010,
      })) as { predicted_price_usd: number }
      const predicted = Math.round(r.predicted_price_usd / 100) * 100
      await store.setPropertyAnalysis(id, predicted, labelFor(p.price_usd, predicted))
    } catch {
      /* оставляем прежнюю метку */
    }
  } else {
    await store.setPropertyAnalysis(id, null, null) // у аренды метки рынка нет
  }

  try {
    const district = (await store.listDistricts()).find((d) => d.id === p.district_id)
    const text = propertySearchText({ ...p, price_usd: p.price_usd, districts: district ? { name_ru: district.name_ru } : null })
    await store.setPropertyEmbedding(id, await deps.embedDocument(text))
  } catch {
    /* поиск по смыслу обновится при следующем пересчёте */
  }
}
