import { describe, expect, it, vi } from 'vitest'
import { predictPrice } from '../src/lib/ml.js'

const reply = (status: number) => new Response('{}', { status })
const fast = { totalMs: 300, pauseMs: 5 }

describe('predictPrice', () => {
  it('дожидается пробуждения сервиса: после 502 и обрыва связи получает оценку', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(reply(502)).mockRejectedValueOnce(new Error('нет связи')).mockResolvedValueOnce(reply(200))
    const res = await predictPrice({}, { ...fast, fetchImpl })
    expect(res.status).toBe(200)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('не повторяет, если сервис отклонил сами данные', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(reply(422))
    await expect(predictPrice({}, { ...fast, fetchImpl })).rejects.toMatchObject({ status: 502 })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('сдаётся, когда время вышло', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('нет связи'))
    await expect(predictPrice({}, { totalMs: 40, pauseMs: 10, fetchImpl })).rejects.toMatchObject({ status: 503 })
    expect(fetchImpl.mock.calls.length).toBeGreaterThan(1)
  })
})
