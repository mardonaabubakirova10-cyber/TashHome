import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { AiUnavailableError, chat, embed, generateJson, toGeminiSchema } from '../src/ai/gemini.js'

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
const reply = (text: string) => ok({ candidates: [{ content: { role: 'model', parts: [{ text }] } }] })
const fast = { apiKey: 'test-key', baseDelayMs: 1, retries: 2, fallbackModel: null as string | null } // запасная модель выключена, пока тест её не включает

describe('gemini: повторы и ошибки', () => {
  it('на 503 повторяет и возвращает ответ', async () => {
    const f = vi.fn().mockResolvedValueOnce(new Response('', { status: 503 })).mockResolvedValueOnce(reply('привет'))
    expect(await chat('hi', undefined, { ...fast, fetchImpl: f })).toBe('привет')
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('на 400 не повторяет и кидает AiUnavailableError', async () => {
    const f = vi.fn().mockResolvedValue(new Response('', { status: 400 }))
    await expect(chat('hi', undefined, { ...fast, fetchImpl: f })).rejects.toBeInstanceOf(AiUnavailableError)
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('после всех повторов сеть → AiUnavailableError', async () => {
    const f = vi.fn().mockRejectedValue(new Error('network'))
    await expect(chat('hi', undefined, { ...fast, fetchImpl: f })).rejects.toBeInstanceOf(AiUnavailableError)
    expect(f).toHaveBeenCalledTimes(3)
  })

  it('без ключа сразу AiUnavailableError, запрос не уходит', async () => {
    const f = vi.fn()
    await expect(chat('hi', undefined, { apiKey: '', fetchImpl: f })).rejects.toBeInstanceOf(AiUnavailableError)
    expect(f).not.toHaveBeenCalled()
  })

  it('ключ уходит в заголовке, а не в адресе', async () => {
    const f = vi.fn().mockResolvedValue(reply('ok'))
    await chat('hi', undefined, { ...fast, fetchImpl: f })
    const [url, init] = f.mock.calls[0]
    expect(String(url)).not.toContain('test-key')
    expect((init as RequestInit).headers).toMatchObject({ 'x-goog-api-key': 'test-key' })
  })
})

describe('gemini: структурированные ответы', () => {
  const schema = z.object({ sentiment: z.enum(['positive', 'neutral', 'negative']), topic: z.string() })

  it('валидный JSON проходит через Zod', async () => {
    const f = vi.fn().mockResolvedValue(reply('{"sentiment":"positive","topic":"service"}'))
    expect(await generateJson('x', schema, undefined, { ...fast, fetchImpl: f })).toEqual({ sentiment: 'positive', topic: 'service' })
  })

  it('ответ не по схеме → AiUnavailableError', async () => {
    const f = vi.fn().mockResolvedValue(reply('{"sentiment":"great","topic":"x"}'))
    await expect(generateJson('x', schema, undefined, { ...fast, fetchImpl: f })).rejects.toBeInstanceOf(AiUnavailableError)
  })

  it('из схемы убраны ключи, которые Gemini не принимает', () => {
    const json = JSON.stringify(toGeminiSchema(schema))
    expect(json).not.toContain('$schema')
    expect(json).not.toContain('additionalProperties')
  })
})

describe('gemini: эмбеддинги', () => {
  it('векторы нормируются', async () => {
    const f = vi.fn().mockResolvedValue(ok({ embedding: { values: [3, 4] } }))
    const [v] = await embed(['a'], 'RETRIEVAL_DOCUMENT', { ...fast, fetchImpl: f })
    expect(v[0]).toBeCloseTo(0.6)
    expect(v[1]).toBeCloseTo(0.8)
  })

  it('неполный ответ → AiUnavailableError', async () => {
    const f = vi.fn().mockResolvedValue(ok({ embedding: { values: [] } }))
    await expect(embed(['a'], 'RETRIEVAL_QUERY', { ...fast, fetchImpl: f })).rejects.toBeInstanceOf(AiUnavailableError)
  })
})

describe('gemini: запасная модель', () => {
  const urls = (f: ReturnType<typeof vi.fn>) => f.mock.calls.map((c) => String(c[0]))

  it('если основная модель перегружена (503), ответ даёт запасная', async () => {
    const f = vi.fn().mockImplementation(async (url: string) => (String(url).includes('primary-m') ? new Response('', { status: 503 }) : reply('ответ запасной')))
    const r = await chat('hi', undefined, { ...fast, fetchImpl: f, model: 'primary-m', fallbackModel: 'backup-m', retries: 1 })
    expect(r).toBe('ответ запасной')
    expect(urls(f).some((u) => u.includes('backup-m'))).toBe(true)
  })

  it('если основная работает, запасная не вызывается', async () => {
    const f = vi.fn().mockResolvedValue(reply('ок'))
    await chat('hi', undefined, { ...fast, fetchImpl: f, model: 'primary-m', fallbackModel: 'backup-m' })
    expect(urls(f).every((u) => u.includes('primary-m'))).toBe(true)
  })

  it('обе модели недоступны → AiUnavailableError', async () => {
    const f = vi.fn().mockResolvedValue(new Response('', { status: 503 }))
    await expect(chat('hi', undefined, { ...fast, fetchImpl: f, model: 'primary-m', fallbackModel: 'backup-m', retries: 0 })).rejects.toBeInstanceOf(AiUnavailableError)
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('ошибка запроса (400) тоже пробует запасную модель один раз', async () => {
    const f = vi.fn().mockResolvedValue(new Response('', { status: 400 }))
    await expect(chat('hi', undefined, { ...fast, fetchImpl: f, model: 'primary-m', fallbackModel: 'backup-m' })).rejects.toBeInstanceOf(AiUnavailableError)
    expect(f).toHaveBeenCalledTimes(2)
  })
})
