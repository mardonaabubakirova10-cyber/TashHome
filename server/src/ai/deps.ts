import { config } from '../config.js'
import { predictPrice } from '../lib/ml.js'
import type { Notifier } from '../lib/notifier.js'
import type { Store } from '../lib/store.js'
import type { AgentDeps } from './agent.js'
import { embed, generateStream } from './gemini.js'
import { uploadToSupabase } from '../lib/imageUpload.js'
import { describeProperty } from './describe.js'
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
          vector = (await embed([query], 'RETRIEVAL_QUERY', { timeoutMs: 6_000, retries: 0 }))[0]
        } catch {
          vector = null
        }
      }
      return store.matchProperties(vector, filters, k)
    },
    getProperty: (id) => store.getProperty(id),
    transcribe: transcribeAudio,
    uploadImage: (data, mime, ext) => uploadToSupabase(data, mime, ext),
    embedMany: (texts) => embed(texts, 'RETRIEVAL_DOCUMENT'),
    embedDocument: async (text) => (await embed([text], 'RETRIEVAL_DOCUMENT'))[0],
    describeProperty: describeProperty,
    async searchKnowledge(question) {
      const [v] = await embed([question], 'RETRIEVAL_QUERY', { timeoutMs: 10_000, retries: 1 })
      return store.matchKnowledge(v, 5)
    },
    async estimate(params) {
      const res = await predictPrice(params)
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
