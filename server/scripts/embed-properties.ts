/**
 * Эмбеддинги домов для поиска по смыслу: считает search_embedding по описанию и характеристикам.
 * По умолчанию только для домов без вектора; --all пересчитывает все (например, после правки текстов).
 * Запуск: npm run props:embed [-- --all]
 */
import { embed } from '../src/ai/gemini.js'
import { config } from '../src/config.js'
import { propertySearchText, type PropertyRow } from '../src/ai/propertyText.js'
import { createRest, vectorLiteral } from '../src/lib/supabaseRest.js'

const db = createRest(config.supabaseUrl, config.supabaseKey)
const all = process.argv.includes('--all')
const rows = await db.get<PropertyRow[]>(`/properties?select=*,districts(name_ru)&status=eq.active${all ? '' : '&search_embedding=is.null'}&order=id.asc`)
console.log(`К расчёту: ${rows.length}`)

for (let i = 0; i < rows.length; i += 16) {
  const batch = rows.slice(i, i + 16)
  const vectors = await embed(batch.map(propertySearchText), 'RETRIEVAL_DOCUMENT')
  for (const [j, row] of batch.entries()) await db.patch(`/properties?id=eq.${row.id}`, { search_embedding: vectorLiteral(vectors[j]) })
  console.log(`${Math.min(i + 16, rows.length)} / ${rows.length}`)
}
console.log('Готово')
