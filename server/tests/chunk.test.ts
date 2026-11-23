import { describe, expect, it } from 'vitest'
import { chunkText, documentTitle } from '../src/ai/chunk.js'
import { propertySearchText, type PropertyRow } from '../src/ai/propertyText.js'

const para = (n: number) => `Абзац ${n}. ` + 'слово '.repeat(60).trim() + '.'

describe('chunkText', () => {
  it('короткий текст — один фрагмент', () => {
    expect(chunkText('Привет.\n\nМир.')).toHaveLength(1)
  })

  it('пустой текст — пустой список', () => {
    expect(chunkText('  \n ')).toEqual([])
  })

  it('фрагменты не длиннее size + перекрытие и перекрываются', () => {
    const text = Array.from({ length: 12 }, (_, i) => para(i)).join('\n\n')
    const chunks = chunkText(text, 800, 150)
    expect(chunks.length).toBeGreaterThan(2)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(800 + 150 + 4)
    // конец предыдущего фрагмента повторяется в начале следующего
    const tailWord = chunks[0].split(/\s+/).slice(-3).join(' ')
    expect(chunks[1].includes(tailWord)).toBe(true)
  })

  it('очень длинный абзац режется по предложениям', () => {
    const long = Array.from({ length: 40 }, (_, i) => `Предложение номер ${i} про дом.`).join(' ')
    expect(chunkText(long).length).toBeGreaterThan(1)
  })
})

describe('documentTitle', () => {
  it('берёт заголовок первого уровня', () => expect(documentTitle('# Ипотека\n\nтекст', 'f.md')).toBe('Ипотека'))
  it('без заголовка — имя файла', () => expect(documentTitle('просто текст', 'f.md')).toBe('f.md'))
})

describe('propertySearchText', () => {
  const row: PropertyRow = {
    id: 1, deal_type: 'sale', title_ru: 'Дом, 4 комн.', description_ru: 'Тихая улица', address: 'ул. Беруни, 5', price_usd: '90000.00',
    area_m2: '120.0', land_sotka: '6.0', rooms: 4, floors: 2, building_type: 'brick', renovation: 'euro', year_built: 2010, districts: { name_ru: 'Чиланзар' },
  }
  it('содержит район, комнаты, ремонт и цену', () => {
    const t = propertySearchText(row)
    for (const part of ['Чиланзар', '4 комн.', 'евроремонт', '90000 USD', 'кирпичный']) expect(t).toContain(part)
  })
})
