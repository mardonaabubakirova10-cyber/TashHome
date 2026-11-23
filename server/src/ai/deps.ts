import { config } from '../config.js'
import { HttpError } from '../lib/errors.js'
import type { Notifier } from '../lib/notifier.js'
import type { Store } from '../lib/store.js'
import type { AgentDeps } from './agent.js'
import { embed, generateStream } from './gemini.js'
import { transcribeAudio } from './transcribe.js'

/** Боевые зависимости агента: Gemini, хранилище, ml-сервис и уведомления менеджерам. */
export function createAgentDeps(store: Store, notifier: Notifier): AgentDeps {
  return {
    llm: (req, onText) => generateStream(req, onText),
    async searchProperties(query, filters, k) {
      // смысловой вектор нужен только для «мягких» пожеланий; если эмбеддинги недоступны, ищем по фильтрам
      let vector: number[] | null = null
      if (query?.trim()) {
        try {
          vector = (await embed([query], 'RETRIEVAL_QUERY'))[0]
        } catch {
          vector = null
        }
      }
      return store.matchProperties(vector, filters, k)
    },
    getProperty: (id) => store.getProperty(id),
    transcribe: transcribeAudio,
    async searchKnowledge(question) {
      const [v] = await embed([question], 'RETRIEVAL_QUERY')
      return store.matchKnowledge(v, 5)
    },
    async estimate(params) {
      let res: Response
      try {
        res = await fetch(`${config.mlUrl}/predict`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(params),
          signal: AbortSignal.timeout(5000),
        })
      } catch {
        throw new HttpError(503, 'Сервис оценки недоступен')
      }
      if (!res.ok) throw new HttpError(502, 'Сервис оценки вернул ошибку')
      const r = (await res.json()) as { predicted_price: number; price_low: number; price_high: number }
      return { predicted_price_usd: r.predicted_price, price_low_usd: r.price_low, price_high_usd: r.price_high, note: 'Ориентировочная оценка модели' }
    },
    async createLead(input) {
      const lead = await store.addLead({
        property_id: input.property_id ?? null,
        name: input.name,
        phone: input.phone,
        message: input.message ?? null,
        source: 'assistant',
      })
      void notifier.newLead(lead)
      return lead
    },
  }
}
