import { createHash } from 'node:crypto'
import type { RequestHandler } from 'express'
import { webhookCallback, type Bot } from 'grammy'

/** Секрет вебхука выводится из токена бота: отдельная настройка не нужна, а подделать запрос без токена нельзя. */
export const webhookSecret = (token: string) => createHash('sha256').update(`tashhome-webhook:${token}`).digest('hex').slice(0, 32)

/** Обработчик вебхука для Express: Telegram присылает обновления POST-запросами на этот адрес. */
export function webhookHandler(bot: Bot, token: string): RequestHandler {
  return webhookCallback(bot, 'express', { secretToken: webhookSecret(token) }) as unknown as RequestHandler
}

/**
 * Запуск бота. С адресом вебхука (боевой сервер) Telegram сам присылает обновления.
 * Без адреса (разработка на своём компьютере) бот опрашивает Telegram сам (long polling).
 */
export async function launchBot(bot: Bot, token: string, webhookUrl: string): Promise<'webhook' | 'polling'> {
  await bot.api.setMyCommands([
    { command: 'start', description: 'Начать / Boshlash' },
    { command: 'manager', description: 'Написать менеджеру / Menejerga yozish' },
    { command: 'lang', description: 'Язык / Til' },
    { command: 'new', description: 'Новый диалог / Yangi suhbat' },
    { command: 'help', description: 'Помощь / Yordam' },
  ])
  if (webhookUrl) {
    await bot.api.setWebhook(webhookUrl, { secret_token: webhookSecret(token), allowed_updates: ['message', 'callback_query'] })
    return 'webhook'
  }
  await bot.api.deleteWebhook() // вебхук и polling несовместимы
  void bot.start({ allowed_updates: ['message', 'callback_query'], onStart: () => undefined })
  return 'polling'
}
