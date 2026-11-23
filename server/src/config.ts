import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT ?? 3000),
  webOrigin: process.env.WEB_APP_URL ?? 'http://localhost:5173',
  mlUrl: process.env.ML_SERVICE_URL ?? 'http://localhost:8001',
}
