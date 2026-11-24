import { json } from 'express'
import { createApp } from './app.js'
import { config } from './config.js'
import { createMemoryStore } from './lib/store.js'
import { notifierFromConfig } from './lib/notifier.js'
import { analyzeReviewWithGemini } from './ai/reviewAnalysis.js'
import { createAgentDeps } from './ai/deps.js'
import { createBot } from './bot/bot.js'
import { launchBot, webhookHandler } from './bot/start.js'
import { createSupabaseAuth, denyAllAuth } from './lib/auth.js'
import { createSupabaseStore } from './lib/supabaseStore.js'

const useDb = Boolean(config.supabaseUrl && config.supabaseKey)
const store = useDb ? createSupabaseStore(config.supabaseUrl, config.supabaseKey) : createMemoryStore()

const notifier = notifierFromConfig()
const deps = createAgentDeps(store, notifier)

// Бот нужен базе (язык и связь с менеджерами хранятся там); без Supabase и без токена он не запускается
const botEnabled = Boolean(useDb && config.telegramToken && config.telegramChatId)
const bot = botEnabled ? createBot({ token: config.telegramToken, managersChatId: Number(config.telegramChatId), webUrl: config.webOrigin.split(',')[0] }, store, deps) : null

const app = createApp(store, notifier, deps, analyzeReviewWithGemini, useDb ? createSupabaseAuth(config.supabaseUrl, config.supabaseKey) : denyAllAuth, (a) => {
  // маршрут вебхука подключаем только в режиме вебхука: grammY не разрешает смешивать его с polling
  if (bot && config.telegramWebhookUrl) a.post('/api/telegram/webhook', json({ limit: '1mb' }), webhookHandler(bot, config.telegramToken))
})

app.listen(config.port, () => {
  console.log(`API: http://localhost:${config.port}/api/health (хранилище: ${useDb ? 'Supabase' : 'память'})`)
  if (bot) {
    launchBot(bot, config.telegramToken, config.telegramWebhookUrl, config.webOrigin.split(',')[0])
      .then((mode) => console.log(`Telegram-бот запущен (${mode})`))
      .catch((e) => console.error('Telegram-бот не запустился:', e instanceof Error ? e.message : e))
  } else {
    console.log('Telegram-бот выключен (нужны SUPABASE_*, TELEGRAM_BOT_TOKEN и TELEGRAM_MANAGERS_CHAT_ID)')
  }
})
