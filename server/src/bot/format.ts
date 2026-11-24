import type { Property } from '../lib/demoProperties.js'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Ответ ассистента (простая разметка с **жирным** и списками) → HTML, который понимает Telegram. Весь текст экранируется. */
export function toTelegramHtml(text: string): string {
  return esc(text)
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
    .split('\n')
    .map((l) => l.replace(/^\s*[*•-]\s+/, '• '))
    .join('\n')
    .trim()
}

const BUILDING = { ru: { brick: 'кирпичный', block: 'блочный', monolith: 'монолитный' }, uz: { brick: 'g‘ishtli', block: 'blokli', monolith: 'monolit' } } as const
const LABEL = { ru: { below: 'ниже рынка', fair: 'по рынку', above: 'выше рынка' }, uz: { below: 'bozordan past', fair: 'bozor narxida', above: 'bozordan yuqori' } } as const

/** Карточка дома для сообщения в Telegram. */
export function propertyCaption(p: Property, lang: 'ru' | 'uz', webUrl: string): string {
  const title = lang === 'uz' ? p.titleUz : p.titleRu
  const price = `$${p.priceUsd.toLocaleString('en-US')}${p.dealType === 'rent' ? (lang === 'uz' ? ' / oy' : ' / мес') : ''}`
  const label = p.priceLabel ? ` · ${LABEL[lang][p.priceLabel]}` : ''
  const specs = `${p.areaM2} м² · ${p.landSotka} ${lang === 'uz' ? 'sotix' : 'сот.'} · ${BUILDING[lang][p.buildingType]}`
  return `<b>${esc(title)}</b>\n${price}${label}\n${esc(specs)}\n${esc(webUrl.replace(/\/$/, ''))}/catalog/${p.id}`
}

/** Адрес фото, который может скачать сам Telegram: только публичный https. Для локальной разработки фото не отправляются. */
export function publicPhotoUrl(photo: string, webUrl: string): string | null {
  if (/^https:\/\//.test(photo)) return photo
  if (photo.startsWith('/') && /^https:\/\//.test(webUrl)) return `${webUrl.replace(/\/$/, '')}${photo}`
  return null
}
