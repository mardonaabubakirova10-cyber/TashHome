/**
 * Перераспределяет фото домов в Supabase по правилам из demoProperties.ts (photosFor) и обновляет SQL-сид.
 * Запуск: npm run props:photos
 */
import { config } from '../src/config.js'
import { buildDemoProperties } from '../src/lib/demoProperties.js'
import { createRest } from '../src/lib/supabaseRest.js'

const db = createRest(config.supabaseUrl, config.supabaseKey)
const props = buildDemoProperties()
const ids = await db.get<Array<{ id: number }>>('/properties?select=id&order=id.asc')
if (ids.length !== props.length || ids.some((r, i) => r.id !== props[i].id)) {
  throw new Error('Номера домов в базе не совпадают с демо-набором; фото не трогаю')
}
await db.remove('/property_photos?id=gt.0')
const rows = props.flatMap((p) => p.photos.map((url, position) => ({ property_id: p.id, url, position })))
await db.insert('property_photos', rows)
console.log(`Фото обновлены: ${rows.length} для ${props.length} домов`)
