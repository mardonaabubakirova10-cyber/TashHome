import { config } from '../config.js'
import type { Lead, Review } from './store.js'

/** Уведомления менеджерам. Сбой отправки никогда не ломает заявку: ошибка пишется в лог без секретов. */
export interface Notifier {
  newLead(lead: Lead): Promise<void>
  negativeReview(review: Review): Promise<void>
}

export const noopNotifier: Notifier = { newLead: async () => {}, negativeReview: async () => {} }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const SOURCES: Record<Lead['source'], string> = { site: 'сайт', miniapp: 'Mini App', bot: 'бот', assistant: 'ИИ-ассистент' }

export function leadText(lead: Lead, webUrl = config.webOrigin.split(',')[0]): string {
  const lines = [
    '🆕 <b>Новая заявка</b>',
    `Имя: ${esc(lead.name)}`,
    `Телефон: ${esc(lead.phone)}`,
    `Источник: ${SOURCES[lead.source]}`,
  ]
  if (lead.property_id) lines.push(`Объект: ${webUrl}/catalog/${lead.property_id}`)
  if (lead.message) lines.push(`Сообщение: ${esc(lead.message)}`)
  return lines.join('\n')
}

export function reviewText(r: Review): string {
  return ['⚠️ <b>Низкая оценка отзыва</b>', `Оценка: ${r.rating} из 5`, `Автор: ${esc(r.author || 'аноним')}`, `Текст: ${esc(r.text)}`].join('\n')
}

export function createTelegramNotifier(token: string, chatId: string, fetchImpl: typeof fetch = fetch): Notifier {
  const send = async (text: string) => {
    try {
      const res = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) console.error(`Telegram: не удалось отправить уведомление (статус ${res.status})`)
    } catch {
      console.error('Telegram: не удалось отправить уведомление (сеть)')
    }
  }
  return {
    newLead: (lead) => send(leadText(lead)),
    negativeReview: (review) => send(reviewText(review)),
  }
}

/** Реальный отправитель, если в .env есть токен и номер чата, иначе заглушка. */
export function notifierFromConfig(): Notifier {
  return config.telegramToken && config.telegramChatId ? createTelegramNotifier(config.telegramToken, config.telegramChatId) : noopNotifier
}
