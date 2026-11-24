import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { runAgent, MAX_TOOL_STEPS, type AgentDeps } from '../src/ai/agent.js'
import { createApp } from '../src/app.js'
import type { GenerateResult } from '../src/ai/gemini.js'
import { buildDemoProperties } from '../src/lib/demoProperties.js'
import { createMemoryStore } from '../src/lib/store.js'

const houses = buildDemoProperties()

const call = (name: string, args: Record<string, unknown>): GenerateResult => ({
  text: '',
  functionCalls: [{ name, args }],
  content: { role: 'model', parts: [{ functionCall: { name, args } }] },
})
const say = (text: string): GenerateResult => ({ text, functionCalls: [], content: { role: 'model', parts: [{ text }] } })

/** Сценарий: модель отвечает заранее заданной последовательностью шагов. */
function scripted(steps: GenerateResult[], overrides: Partial<AgentDeps> = {}) {
  let i = 0
  const llm = vi.fn(async (_req: unknown, onText: (c: string) => void) => {
    const r = steps[Math.min(i++, steps.length - 1)]
    if (r.text) onText(r.text)
    return r
  })
  const deps: AgentDeps = {
    llm: llm as unknown as AgentDeps['llm'],
    searchProperties: vi.fn(async () => houses.slice(0, 2)),
    transcribe: vi.fn(async () => 'привет'),
    embedDocument: vi.fn(async () => [0.1]),
    uploadImage: vi.fn(async () => 'https://x.supabase.co/storage/v1/object/public/property-photos/a.jpg'),
    describeProperty: vi.fn(async () => ({ ru: 'описание дома на русском языке', uz: 'uy tavsifi oʻzbek tilida' })),
    getProperty: vi.fn(async (id) => houses.find((p) => p.id === id) ?? null),
    searchKnowledge: vi.fn(async () => []),
    estimate: vi.fn(async () => ({ predicted_price_usd: 100000 })),
    createLead: vi.fn(async (l) => ({ id: 1, property_id: l.property_id ?? null, name: l.name, phone: l.phone, message: l.message ?? null, source: 'assistant' as const, status: 'new' as const, created_at: '' })),
    ...overrides,
  }
  return { deps, llm }
}

const input = { history: [], message: 'двушка в Чиланзаре до 60 тысяч', lang: 'ru' as const, allowLead: true }

describe('агент: поиск', () => {
  it('вызывает search_properties с правильными фильтрами и возвращает карточки', async () => {
    const { deps } = scripted([call('search_properties', { district_id: 'chilanzar', max_price: 60000, min_rooms: 2, deal_type: 'sale' }), say('Нашёл два варианта.')])
    const r = await runAgent(input, deps)
    expect(deps.searchProperties).toHaveBeenCalledWith(undefined, { district_id: 'chilanzar', max_price: 60000, min_rooms: 2, deal_type: 'sale' }, 5)
    expect(r.text).toBe('Нашёл два варианта.')
    expect(r.properties).toHaveLength(2)
    expect(r.tools[0]).toMatchObject({ name: 'search_properties', ok: true })
  })

  it('неверный район от модели не ломает диалог: инструмент возвращает ошибку', async () => {
    const { deps } = scripted([call('search_properties', { district_id: 'moon' }), say('Уточните район.')])
    const r = await runAgent(input, deps)
    expect(deps.searchProperties).not.toHaveBeenCalled()
    expect(r.tools[0].ok).toBe(false)
    expect(r.text).toBe('Уточните район.')
  })

  it('если смысловой поиск ничего не дал, повторяет только по фильтрам', async () => {
    const search = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce(houses.slice(0, 1))
    const { deps } = scripted([call('search_properties', { query: 'уютный', district_id: 'mirabad' }), say('ок')], { searchProperties: search })
    const r = await runAgent(input, deps)
    expect(search).toHaveBeenCalledTimes(2)
    expect(search.mock.calls[1][0]).toBeUndefined()
    expect(r.properties).toHaveLength(1)
  })
})

describe('агент: база знаний и расчёты', () => {
  it('ниже порога релевантности отдаёт found=false', async () => {
    const { deps, llm } = scripted([call('search_knowledge', { question: 'как приготовить плов' }), say('Не знаю, свяжитесь с менеджером.')], {
      searchKnowledge: vi.fn(async () => [{ title: 'FAQ', content: 'x', similarity: 0.57 }]),
    })
    await runAgent(input, deps)
    const secondCall = llm.mock.calls[1][0] as { contents: Array<{ parts: Array<{ functionResponse?: { response: { result: { found: boolean } } } }> }> }
    expect(secondCall.contents.at(-1)!.parts[0].functionResponse!.response.result.found).toBe(false)
  })

  it('calc_mortgage считает платёж по типовым условиям', async () => {
    const { deps } = scripted([call('calc_mortgage', { price: 100000 }), say('Платёж около ...')])
    const r = await runAgent(input, deps)
    expect(r.tools[0].summary).toContain('monthly_payment_usd')
    expect(r.tools[0].summary).toContain('30000') // взнос 30 %
  })
})

describe('агент: заявка', () => {
  const args = { name: 'Алишер', phone: '+998 90 123-45-67', property_id: 3, confirmed: true }

  it('после подтверждения создаёт заявку с нормализованным телефоном', async () => {
    const { deps } = scripted([call('create_lead', args), say('Заявка принята.')])
    const r = await runAgent(input, deps)
    expect(deps.createLead).toHaveBeenCalledWith({ name: 'Алишер', phone: '+998901234567', property_id: 3, message: undefined })
    expect(r.leadCreated).toBe(true)
  })

  it('без confirmed заявка не создаётся', async () => {
    const { deps } = scripted([call('create_lead', { ...args, confirmed: false }), say('Подтвердите данные.')])
    const r = await runAgent(input, deps)
    expect(deps.createLead).not.toHaveBeenCalled()
    expect(r.leadCreated).toBe(false)
  })

  it('в первом сообщении диалога заявка запрещена', async () => {
    const { deps } = scripted([call('create_lead', args), say('Сначала подтвердим.')])
    const r = await runAgent({ ...input, allowLead: false }, deps)
    expect(deps.createLead).not.toHaveBeenCalled()
    expect(r.leadCreated).toBe(false)
  })

  it('неверный телефон не проходит', async () => {
    const { deps } = scripted([call('create_lead', { ...args, phone: '123' }), say('Нужен телефон +998…')])
    await runAgent(input, deps)
    expect(deps.createLead).not.toHaveBeenCalled()
  })
})

describe('агент: лимит шагов', () => {
  it(`не больше ${MAX_TOOL_STEPS} шагов с инструментами, затем ответ без них`, async () => {
    // модель «зацикливается» на инструментах, пока они ей доступны; без инструментов отвечает текстом
    const { deps } = scripted([say('x')])
    const llm = vi.fn(async (req: { tools?: unknown }, onText: (c: string) => void) => {
      if (req.tools) return call('search_properties', {})
      onText('Вот что нашёл.')
      return say('Вот что нашёл.')
    })
    deps.llm = llm as unknown as AgentDeps['llm']
    const r = await runAgent(input, deps)
    expect(llm).toHaveBeenCalledTimes(MAX_TOOL_STEPS + 1)
    expect(llm.mock.calls.at(-1)![0].tools).toBeUndefined()
    expect(r.tools).toHaveLength(MAX_TOOL_STEPS)
    expect(r.text).toBe('Вот что нашёл.')
  })
})

describe('POST /api/chat (SSE)', () => {
  const sse = (text: string) => text.split('\n\n').filter(Boolean).map((b) => ({ event: /event: (.*)/.exec(b)![1], data: JSON.parse(/data: (.*)/.exec(b)![1]) }))

  it('отдаёт session, token, properties, done и сохраняет сообщения', async () => {
    const store = createMemoryStore()
    const { deps } = scripted([call('search_properties', { district_id: 'chilanzar' }), say('Нашёл варианты.')])
    const app = createApp(store, undefined, deps)
    const r = await request(app).post('/api/chat').send({ message: 'дом в Чиланзаре', lang: 'ru' }).buffer(true).parse((res, cb) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => cb(null, data))
    })
    const events = sse(r.body as string)
    expect(r.headers['content-type']).toContain('text/event-stream')
    expect(events.map((e) => e.event)).toEqual(['session', 'status', 'token', 'properties', 'done'])
    const sessionId = events[0].data.id
    const history = await store.getChatHistory(sessionId, 10)
    expect(history.map((m) => m.role)).toEqual(['user', 'assistant'])
    expect(history[1].tool_calls).toBeTruthy()
  })

  it('пустое и слишком длинное сообщение → 400', async () => {
    const app = createApp(createMemoryStore(), undefined, scripted([say('x')]).deps)
    await request(app).post('/api/chat').send({ message: '   ' }).expect(400)
    await request(app).post('/api/chat').send({ message: 'а'.repeat(1001) }).expect(400)
  })

  it('сбой ИИ → событие error, без падения сервера', async () => {
    const { AiUnavailableError } = await import('../src/ai/gemini.js')
    const { deps } = scripted([say('x')], {})
    deps.llm = vi.fn().mockRejectedValue(new AiUnavailableError())
    const app = createApp(createMemoryStore(), undefined, deps)
    const r = await request(app).post('/api/chat').send({ message: 'привет' }).buffer(true).parse((res, cb) => {
      let data = ''
      res.on('data', (c) => (data += c))
      res.on('end', () => cb(null, data))
    })
    const events = sse(r.body as string)
    expect(events.at(-1)).toEqual({ event: 'error', data: { code: 'ai_unavailable' } })
  })
})
