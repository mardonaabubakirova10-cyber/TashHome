import { config as loadEnv } from 'dotenv'
import { fileURLToPath } from 'node:url'

// Единый файл настроек лежит в корне проекта (.env). Файл server/.env, если он есть, имеет приоритет.
loadEnv()
loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })

export const config = {
  port: Number(process.env.PORT ?? 3000),
  webOrigin: process.env.WEB_APP_URL ?? 'http://localhost:5173',
  mlUrl: process.env.ML_SERVICE_URL ?? 'http://localhost:8001',
  geminiKey: process.env.GEMINI_API_KEY ?? '',
  geminiChatModel: process.env.GEMINI_CHAT_MODEL || 'gemini-3.1-flash-lite',
  geminiEmbedModel: process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001',
  telegramToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  telegramChatId: process.env.TELEGRAM_MANAGERS_CHAT_ID ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
}
