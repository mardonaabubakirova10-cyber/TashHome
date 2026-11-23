/** Живая проверка ключа Gemini: чат, ответ по схеме, эмбеддинг. Запуск: npx tsx scripts/check-gemini.ts */
import { z } from 'zod'
import { chat, EMBED_DIM, embed, generateJson } from '../src/ai/gemini.js'

console.log('чат:', (await chat('Ответь одним словом: столица Узбекистана?')).trim())

const r = await generateJson(
  'Отзыв клиента: «Менеджер долго не отвечал, но дом нашли хороший». Определи тональность и тему.',
  z.object({ sentiment: z.enum(['positive', 'neutral', 'negative']), topic: z.enum(['service', 'price', 'property', 'manager', 'other']) }),
)
console.log('схема:', r)

const [v] = await embed(['Кирпичный дом с участком в Юнусабаде'])
console.log('эмбеддинг: размерность', v.length, v.length === EMBED_DIM ? 'OK' : 'НЕ СОВПАДАЕТ')
