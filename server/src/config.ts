import { config as loadEnv } from 'dotenv'
import { fileURLToPath } from 'node:url'

// Единый файл настроек лежит в корне проекта (.env). Файл server/.env, если он есть, имеет приоритет.
loadEnv()
loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })

export const config = {
  port: Number(process.env.PORT ?? 3000),
  webOrigin: process.env.WEB_APP_URL ?? 'http://localhost:5173',
  mlUrl: process.env.ML_SERVICE_URL ?? 'http://localhost:8001',
}
