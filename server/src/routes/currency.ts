import { Router } from 'express'
import { getUsdRate } from '../lib/currency.js'

export const currencyRouter = Router()

currencyRouter.get('/', async (_req, res) => {
  const { rate, date, source } = await getUsdRate()
  res.json({ usd_uzs: rate, date, source })
})
