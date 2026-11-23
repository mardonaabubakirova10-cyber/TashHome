import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { AiUnavailableError } from '../src/ai/gemini.js'
import { normalizeAudioType } from '../src/ai/transcribe.js'
import { createApp } from '../src/app.js'
import type { AgentDeps } from '../src/ai/agent.js'
import { createMemoryStore } from '../src/lib/store.js'

const make = (transcribe: AgentDeps['transcribe']) =>
  createApp(createMemoryStore(), undefined, { transcribe } as unknown as AgentDeps)
const audio = Buffer.alloc(2000, 1)

describe('normalizeAudioType', () => {
  it('убирает параметры и пропускает только аудио', () => {
    expect(normalizeAudioType('audio/webm;codecs=opus')).toBe('audio/webm')
    expect(normalizeAudioType('AUDIO/OGG')).toBe('audio/ogg')
    expect(normalizeAudioType('text/html')).toBeNull()
    expect(normalizeAudioType(undefined)).toBeNull()
  })
})

describe('POST /api/transcribe', () => {
  it('возвращает расшифровку и передаёт тип без параметров', async () => {
    const t = vi.fn().mockResolvedValue('дом в Юнусабаде')
    const r = await request(make(t)).post('/api/transcribe').set('content-type', 'audio/webm;codecs=opus').send(audio)
    expect(r.status).toBe(200)
    expect(r.body).toEqual({ text: 'дом в Юнусабаде' })
    expect(t).toHaveBeenCalledWith(expect.any(Buffer), 'audio/webm')
  })

  it('не аудио → 415', async () => {
    await request(make(vi.fn())).post('/api/transcribe').set('content-type', 'application/json').send('{"a":1}').expect(415)
  })

  it('слишком короткая запись → 400', async () => {
    await request(make(vi.fn())).post('/api/transcribe').set('content-type', 'audio/webm').send(Buffer.alloc(10)).expect(400)
  })

  it('больше 2 МБ → 413', async () => {
    await request(make(vi.fn())).post('/api/transcribe').set('content-type', 'audio/webm').send(Buffer.alloc(2 * 1024 * 1024 + 10)).expect(413)
  })

  it('сбой ИИ → 503 с понятным сообщением', async () => {
    const t = vi.fn().mockRejectedValue(new AiUnavailableError())
    const r = await request(make(t)).post('/api/transcribe').set('content-type', 'audio/webm').send(audio)
    expect(r.status).toBe(503)
    expect(r.body.error).toContain('временно недоступно')
  })
})
