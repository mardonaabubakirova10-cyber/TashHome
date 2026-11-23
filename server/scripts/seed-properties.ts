/**
 * Заливает демо-дома в Supabase (REST, ключ сервера из .env) и пишет тот же набор в supabase/seed/02_properties.sql.
 * Запуск: npx tsx scripts/seed-properties.ts [--sql-only]
 * Повторный запуск не дублирует дома: если таблица не пуста, скрипт останавливается.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { config } from '../src/config.js'
import { buildDemoProperties, type Property } from '../src/lib/demoProperties.js'

const props = buildDemoProperties()
const q = (s: string) => `'${s.replace(/'/g, "''")}'`

function toSql(items: Property[]): string {
  const rows = items.map(
    (p) =>
      `(${p.id}, '${p.dealType}', ${q(p.titleRu)}, ${q(p.titleUz)}, ${q(p.descriptionRu)}, ${q(p.descriptionUz)}, '${p.districtId}', ${q(p.address)}, ${p.lat}, ${p.lng}, ${p.priceUsd}, ${p.areaM2}, ${p.landSotka}, ${p.rooms}, ${p.floors}, '${p.buildingType}', '${p.renovation}', ${p.yearBuilt})`,
  )
  const photos = items.flatMap((p) => p.photos.map((url, i) => `(${p.id}, '${url}', ${i})`))
  return `-- Демо-дома (генерируются: server/scripts/seed-properties.ts). 100 штук, по 4 фото на каждый.
insert into properties
  (id, deal_type, title_ru, title_uz, description_ru, description_uz, district_id, address, lat, lng, price_usd, area_m2, land_sotka, rooms, floors, building_type, renovation, year_built)
overriding system value
values
${rows.join(',\n')};

insert into property_photos (property_id, url, position) values
${photos.join(',\n')};

select setval(pg_get_serial_sequence('properties', 'id'), (select max(id) from properties));
`
}

writeFileSync(fileURLToPath(new URL('../../supabase/seed/02_properties.sql', import.meta.url)), toSql(props), 'utf8')
console.log('supabase/seed/02_properties.sql записан')

if (!process.argv.includes('--sql-only')) {
  const base = `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1`
  const headers = {
    apikey: config.supabaseKey,
    Authorization: `Bearer ${config.supabaseKey}`,
    'content-type': 'application/json',
    'user-agent': 'tashhome-seed/1.0',
  }
  const call = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(`${base}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } })
    if (!res.ok) throw new Error(`Supabase ${res.status} ${path}: ${await res.text()}`)
    return res
  }

  const existing = (await (await call('/properties?select=id&limit=1')).json()) as unknown[]
  if (existing.length) {
    console.log('В таблице properties уже есть данные, заливку пропускаю')
  } else {
    const body = props.map((p) => ({
      deal_type: p.dealType, title_ru: p.titleRu, title_uz: p.titleUz, description_ru: p.descriptionRu, description_uz: p.descriptionUz,
      district_id: p.districtId, address: p.address, lat: p.lat, lng: p.lng, price_usd: p.priceUsd, area_m2: p.areaM2, land_sotka: p.landSotka,
      rooms: p.rooms, floors: p.floors, building_type: p.buildingType, renovation: p.renovation, year_built: p.yearBuilt,
    }))
    const inserted = (await (await call('/properties', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(body) })).json()) as Array<{ id: number }>
    // идентификаторы приходят в том же порядке, что и отправленные строки
    const photos = inserted.flatMap((row, i) => props[i].photos.map((url, position) => ({ property_id: row.id, url, position })))
    await call('/property_photos', { method: 'POST', body: JSON.stringify(photos) })
    console.log(`Залито: ${inserted.length} домов, ${photos.length} фото`)
  }
}
