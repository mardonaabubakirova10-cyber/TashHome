/**
 * Индексация базы знаний: knowledge/*.md → kb_documents + kb_chunks (с эмбеддингами Gemini).
 * Повторный запуск не плодит дубли: документ с тем же именем файла пересоздаётся целиком.
 * Запуск: npm run kb:index
 */
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chunkText, documentTitle } from '../src/ai/chunk.js'
import { embed } from '../src/ai/gemini.js'
import { config } from '../src/config.js'
import { createRest, vectorLiteral } from '../src/lib/supabaseRest.js'

const dir = fileURLToPath(new URL('../../knowledge/', import.meta.url))
const db = createRest(config.supabaseUrl, config.supabaseKey)
const files = readdirSync(dir).filter((f) => /^\d.*\.md$/.test(f)).sort()

let total = 0
for (const file of files) {
  const text = readFileSync(dir + file, 'utf8')
  const chunks = chunkText(text)
  const vectors = await embed(chunks, 'RETRIEVAL_DOCUMENT')

  await db.remove(`/kb_documents?source_file=eq.${encodeURIComponent(file)}`) // чанки удалятся каскадом
  const [doc] = await db.insert<{ id: number }>('kb_documents', { title: documentTitle(text, file), source_file: file })
  await db.insert('kb_chunks', chunks.map((content, i) => ({ document_id: doc.id, content, embedding: vectorLiteral(vectors[i]) })))
  total += chunks.length
  console.log(`${file}: ${chunks.length} фрагм.`)
}
console.log(`Готово: ${files.length} документов, ${total} фрагментов`)
