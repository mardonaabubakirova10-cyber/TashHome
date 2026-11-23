/**
 * Размечает тональностью и темой отзывы, у которых разметки ещё нет (или все, с --all).
 * Запуск: npm run reviews:analyze [-- --all]
 */
import { analyzeReviewWithGemini } from '../src/ai/reviewAnalysis.js'
import { config } from '../src/config.js'
import { createRest } from '../src/lib/supabaseRest.js'

const db = createRest(config.supabaseUrl, config.supabaseKey)
const all = process.argv.includes('--all')
const rows = await db.get<Array<{ id: number; rating: number; text: string }>>(`/reviews?select=id,rating,text${all ? '' : '&or=(topic.is.null,sentiment.is.null)'}&order=id.asc`)
console.log(`К разметке: ${rows.length}`)
let done = 0
for (const r of rows) {
  const a = await analyzeReviewWithGemini(r.text, r.rating)
  if (!a) {
    console.log(`#${r.id}: ИИ недоступен, пропускаю`)
    continue
  }
  await db.patch(`/reviews?id=eq.${r.id}`, a)
  console.log(`#${r.id} (${r.rating}★): ${a.sentiment} / ${a.topic}`)
  done++
}
console.log(`Размечено: ${done}`)
