import { describe, expect, it, vi } from 'vitest'
import type { AgentDeps } from '../src/ai/agent.js'
import { AiUnavailableError, type GenerateResult } from '../src/ai/gemini.js'
import { createBot } from '../src/bot/bot.js'
import { propertyCaption, publicPhotoUrl, toTelegramHtml } from '../src/bot/format.js'
import { webhookSecret } from '../src/bot/start.js'
import { buildDemoProperties } from '../src/lib/demoProperties.js'
import { createMemoryStore } from '../src/lib/store.js'

const GROUP = -100500
const houses = buildDemoProperties()
const say = (text: string): GenerateResult => ({ text, functionCalls: [], content: { role: 'model', parts: [{ text }] } })
const call = (name: string, args: Record<string, unknown>): GenerateResult => ({ text: '', functionCalls: [{ name, args }], content: { role: 'model', parts: [{ functionCall: { name, args } }] } })

function setup(opts: { steps?: GenerateResult[]; webUrl?: string; perMinute?: number; llmError?: boolean } = {}) {
  const store = createMemoryStore()
  let i = 0
  const steps = opts.steps ?? [say('Здравствуйте! **Чем помочь?**')]
  const agent = {
    llm: vi.fn(async (_req: unknown, onText: (c: string) => void) => {
      if (opts.llmError) throw new AiUnavailableError()
      const r = steps[Math.min(i++, steps.length - 1)]
      if (r.text) onText(r.text)
      return r
    }),
    searchProperties: vi.fn(async () => houses.slice(0, 2)),
    getProperty: vi.fn(),
    searchKnowledge: vi.fn(async () => []),
    estimate: vi.fn(),
    createLead: vi.fn(),
    transcribe: vi.fn(async () => 'дом в Юнусабаде'),
  } as unknown as AgentDeps
  const bot = createBot({ token: 'TOKEN', managersChatId: GROUP, webUrl: opts.webUrl ?? 'http://localhost:5173', perMinute: opts.perMinute }, store, agent, async () => Buffer.alloc(2000, 1))
  bot.botInfo = { id: 1, is_bot: true, first_name: 'b', username: 'tashhomeebot', can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: false, can_connect_to_business: false, has_main_web_app: false } as never
  const calls: Array<{ method: string; payload: Record<string, any> }> = []
  let mid = 1000
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, any> })
    const result = method === 'getFile' ? { file_id: 'f', file_path: 'voice/a.oga' } : method.startsWith('send') ? { message_id: ++mid, chat: { id: (payload as any).chat_id }, date: 0 } : true
    return { ok: true, result } as never
  })
  let upd = 0
  const send = (u: Record<string, unknown>) => bot.handleUpdate({ update_id: ++upd, ...u } as never)
  const priv = (chatId: number, text: string, extra: Record<string, unknown> = {}) =>
    send({ message: { message_id: ++upd, date: 0, chat: { id: chatId, type: 'private', first_name: 'Али' }, from: { id: chatId, is_bot: false, first_name: 'Али', username: 'ali', language_code: 'ru' }, text, ...(text.startsWith('/') ? { entities: [{ type: 'bot_command', offset: 0, length: text.split(' ')[0].length }] } : {}), ...extra } })
  const sent = (method = 'sendMessage') => calls.filter((c) => c.method === method)
  return { store, agent, bot, calls, send, priv, sent }
}

describe('форматирование для Telegram', () => {
  it('экранирует HTML, делает жирный и маркеры списка', () => {
    expect(toTelegramHtml('<script>x</script> **важно**\n* пункт\n- ещё')).toBe('&lt;script&gt;x&lt;/script&gt; <b>важно</b>\n• пункт\n• ещё')
  })
  it('фото отправляются только по публичному https', () => {
    expect(publicPhotoUrl('/houses/a.jpg', 'http://localhost:5173')).toBeNull()
    expect(publicPhotoUrl('/houses/a.jpg', 'https://tash.uz/')).toBe('https://tash.uz/houses/a.jpg')
    expect(publicPhotoUrl('https://cdn.x/a.jpg', 'http://localhost')).toBe('https://cdn.x/a.jpg')
  })
  it('карточка дома: цена, метка, ссылка; название экранируется', () => {
    const c = propertyCaption({ ...houses[0], titleRu: 'Дом <b>1</b>', priceLabel: 'below' }, 'ru', 'https://tash.uz')
    expect(c).toContain('Дом &lt;b&gt;1&lt;/b&gt;')
    expect(c).toContain('ниже рынка')
    expect(c).toContain(`https://tash.uz/catalog/${houses[0].id}`)
  })
  it('секрет вебхука зависит от токена и не равен ему', () => {
    expect(webhookSecret('A')).not.toBe(webhookSecret('B'))
    expect(webhookSecret('A')).not.toContain('A')
  })
})

describe('команды и язык', () => {
  it('/start приветствует и запоминает язык по настройкам Telegram', async () => {
    const t = setup()
    await t.send({ message: { message_id: 1, date: 0, chat: { id: 7, type: 'private' }, from: { id: 7, is_bot: false, first_name: 'Б', language_code: 'uz' }, text: '/start', entities: [{ type: 'bot_command', offset: 0, length: 6 }] } })
    expect(t.sent()[0].payload.text).toContain('Assalomu alaykum')
    expect((await t.store.getBotUser(7))?.lang).toBe('uz')
  })

  it('кнопка выбора языка переключает язык', async () => {
    const t = setup()
    await t.priv(5, '/start')
    await t.send({ callback_query: { id: 'c', chat_instance: 'x', from: { id: 5, is_bot: false, first_name: 'Али' }, message: { message_id: 1, date: 0, chat: { id: 5, type: 'private' } }, data: 'lang:uz' } })
    expect((await t.store.getBotUser(5))?.lang).toBe('uz')
    expect(t.sent().at(-1)?.payload.text).toContain('o‘zbekchaga')
  })

  it('/new сбрасывает диалог', async () => {
    const t = setup()
    await t.priv(5, 'привет')
    const first = (await t.store.getBotUser(5))!.session_id
    await t.priv(5, '/new')
    expect((await t.store.getBotUser(5))?.session_id).toBeNull()
    await t.priv(5, 'снова')
    expect((await t.store.getBotUser(5))?.session_id).not.toBe(first)
  })
})

describe('диалог с ассистентом', () => {
  it('текст → ответ ассистента HTML-разметкой, сообщения сохраняются', async () => {
    const t = setup()
    await t.priv(5, 'привет')
    expect(t.sent().at(-1)?.payload).toMatchObject({ text: 'Здравствуйте! <b>Чем помочь?</b>', parse_mode: 'HTML' })
    const sid = (await t.store.getBotUser(5))!.session_id!
    expect((await t.store.getChatHistory(sid, 10)).map((m) => m.role)).toEqual(['user', 'assistant'])
  })

  it('найденные дома приходят карточками со ссылками (без фото на http)', async () => {
    const t = setup({ steps: [call('search_properties', { district_id: 'chilanzar' }), say('Нашёл варианты.')] })
    await t.priv(5, 'дом в Чиланзаре')
    const cards = t.sent().filter((c) => String(c.payload.text).includes('/catalog/'))
    expect(cards).toHaveLength(2)
    expect(t.sent('sendPhoto')).toHaveLength(0)
  })

  it('на https-сайте карточки уходят с фото', async () => {
    const t = setup({ steps: [call('search_properties', {}), say('Вот.')], webUrl: 'https://tash.uz' })
    await t.priv(5, 'дом')
    expect(t.sent('sendPhoto').length).toBe(2)
    expect(t.sent('sendPhoto')[0].payload.photo).toMatch(/^https:\/\/tash\.uz\/houses\//)
  })

  it('сбой ИИ → понятное сообщение', async () => {
    const t = setup({ llmError: true })
    await t.priv(5, 'привет')
    expect(t.sent().at(-1)?.payload.text).toContain('/manager')
  })

  it('частые сообщения ограничиваются', async () => {
    const t = setup({ perMinute: 2 })
    await t.priv(5, 'раз')
    await t.priv(5, 'два')
    await t.priv(5, 'три')
    expect(t.sent().at(-1)?.payload.text).toContain('Слишком много')
    expect(t.agent.llm).toHaveBeenCalledTimes(2)
  })
})

describe('голос', () => {
  const voice = (duration: number, file_size = 5000) => ({ voice: { file_id: 'f', file_unique_id: 'u', duration, mime_type: 'audio/ogg', file_size } })
  const msg = (chatId: number, v: Record<string, unknown>) => ({ message: { message_id: 9, date: 0, chat: { id: chatId, type: 'private' }, from: { id: chatId, is_bot: false, first_name: 'Али' }, ...v } })

  it('голосовое расшифровывается и уходит ассистенту', async () => {
    const t = setup()
    await t.send(msg(5, voice(8)))
    expect(t.agent.transcribe).toHaveBeenCalledWith(expect.any(Buffer), 'audio/ogg')
    expect(t.sent()[0].payload.text).toContain('дом в Юнусабаде')
    expect(t.agent.llm).toHaveBeenCalledTimes(1)
  })

  it('длиннее минуты — отказ без расшифровки', async () => {
    const t = setup()
    await t.send(msg(5, voice(90)))
    expect(t.agent.transcribe).not.toHaveBeenCalled()
    expect(t.sent()[0].payload.text).toContain('минуты')
  })

  it('неразборчивая речь — просьба повторить', async () => {
    const t = setup()
    vi.mocked(t.agent.transcribe).mockResolvedValueOnce('')
    await t.send(msg(5, voice(3)))
    expect(t.sent()[0].payload.text).toContain('не расслышана')
    expect(t.agent.llm).not.toHaveBeenCalled()
  })
})

describe('обратная связь с менеджерами', () => {
  it('/manager → следующее сообщение уходит в группу, ответ менеджера возвращается клиенту', async () => {
    const t = setup()
    await t.priv(5, '/manager')
    await t.priv(5, 'Хочу уточнить условия по дому 7')
    const toGroup = t.sent().find((c) => c.payload.chat_id === GROUP)!
    expect(toGroup.payload.text).toContain('Хочу уточнить условия по дому 7')
    expect(t.agent.llm).not.toHaveBeenCalled() // это обращение к менеджеру, не к ассистенту
    const groupMsgId = Number(await t.store.getBotThread(1002).then((c) => (c === 5 ? 1002 : 0))) // сообщение группы получило номер 1002 (1001 занял ответ клиенту)
    expect(groupMsgId).toBe(1002)

    await t.send({ message: { message_id: 50, date: 0, chat: { id: GROUP, type: 'supergroup' }, from: { id: 99, is_bot: false, first_name: 'Мен' }, text: 'Добрый день, перезвоню в 15:00', reply_to_message: { message_id: groupMsgId, date: 0, chat: { id: GROUP, type: 'supergroup' } } } })
    const back = t.sent().find((c) => c.payload.chat_id === 5 && String(c.payload.text).includes('перезвоню'))!
    expect(back.payload.text).toContain('Менеджер:')
    expect(t.calls.some((c) => c.method === 'setMessageReaction')).toBe(true)
  })

  it('ответ на постороннее сообщение группы клиенту не уходит', async () => {
    const t = setup()
    await t.send({ message: { message_id: 51, date: 0, chat: { id: GROUP, type: 'supergroup' }, from: { id: 99, is_bot: false, first_name: 'Мен' }, text: 'ответ', reply_to_message: { message_id: 4242, date: 0, chat: { id: GROUP, type: 'supergroup' } } } })
    expect(t.calls.filter((c) => c.method === 'sendMessage')).toHaveLength(0)
  })

  it('сообщения из чужой группы не принимаются за ответ менеджера', async () => {
    const t = setup()
    await t.store.saveBotThread(1001, 5)
    await t.send({ message: { message_id: 52, date: 0, chat: { id: -999, type: 'supergroup' }, from: { id: 1, is_bot: false, first_name: 'Чужой' }, text: 'подделка', reply_to_message: { message_id: 1001, date: 0, chat: { id: -999, type: 'supergroup' } } } })
    expect(t.sent()).toHaveLength(0)
  })
})

describe('«Взять в работу»', () => {
  const press = (chatId: number, leadId: number) => ({ callback_query: { id: 'c', chat_instance: 'x', from: { id: 99, is_bot: false, first_name: 'Мен', username: 'manager1' }, message: { message_id: 7, date: 0, chat: { id: chatId, type: 'supergroup' }, text: '🆕 Новая заявка\nИмя: Алишер' }, data: `take:${leadId}` } })

  it('из группы менеджеров: статус меняется, сообщение помечается', async () => {
    const t = setup()
    const lead = await t.store.addLead({ property_id: 1, name: 'Алишер', phone: '+998901234567', message: null, source: 'site' })
    await t.send(press(GROUP, lead.id))
    expect((await t.store.adminGetLead(lead.id))?.status).toBe('in_progress')
    expect(t.calls.find((c) => c.method === 'editMessageText')?.payload.text).toContain('В работе: @manager1')
  })

  it('повторное нажатие не перезаписывает', async () => {
    const t = setup()
    const lead = await t.store.addLead({ property_id: null, name: 'Алишер', phone: '+998901234567', message: null, source: 'site' })
    await t.send(press(GROUP, lead.id))
    t.calls.length = 0
    await t.send(press(GROUP, lead.id))
    expect(t.calls.some((c) => c.method === 'editMessageText')).toBe(false)
    expect(t.calls.find((c) => c.method === 'answerCallbackQuery')?.payload.text).toContain('уже в работе')
  })

  it('из другого чата кнопка не работает', async () => {
    const t = setup()
    const lead = await t.store.addLead({ property_id: null, name: 'Алишер', phone: '+998901234567', message: null, source: 'site' })
    await t.send(press(-777, lead.id))
    expect((await t.store.adminGetLead(lead.id))?.status).toBe('new')
  })
})
