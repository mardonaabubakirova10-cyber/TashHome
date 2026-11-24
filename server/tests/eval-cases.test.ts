import { describe, expect, it } from 'vitest'
import { buildDemoProperties } from '../src/lib/demoProperties.js'
import { KB_CASES, matches, SEARCH_CASES } from '../eval/cases.js'

const all = buildDemoProperties()

describe('оценочный набор', () => {
  it('30 запросов на подбор и 20 вопросов к базе знаний', () => {
    expect(SEARCH_CASES).toHaveLength(30)
    expect(KB_CASES).toHaveLength(20)
  })

  it('есть и русские, и узбекские запросы, и вопросы вне темы', () => {
    expect(SEARCH_CASES.some((c) => c.lang === 'uz')).toBe(true)
    expect(KB_CASES.filter((c) => c.outOfScope).length).toBeGreaterThanOrEqual(3)
  })

  it('большинство запросов имеют подходящие дома в каталоге, но есть и без них (проверка честности)', () => {
    const empty = SEARCH_CASES.filter((c) => !all.some((p) => matches(c.c, p)))
    expect(empty.length).toBeGreaterThanOrEqual(2)
    expect(empty.length).toBeLessThanOrEqual(6)
  })

  it('matches проверяет все ограничения', () => {
    const p = { ...all[0], dealType: 'sale' as const, districtId: 'mirabad', rooms: 4, priceUsd: 90000, areaM2: 150, landSotka: 6 }
    expect(matches({ deal: 'sale', district: 'mirabad', minRooms: 4, maxPrice: 90000, minArea: 150, minLand: 6 }, p)).toBe(true)
    expect(matches({ maxPrice: 89999 }, p)).toBe(false)
    expect(matches({ deal: 'rent' }, p)).toBe(false)
    expect(matches({ minRooms: 5 }, p)).toBe(false)
  })
})
