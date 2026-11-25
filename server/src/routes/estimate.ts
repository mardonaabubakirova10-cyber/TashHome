import { Router } from 'express'
import { z } from 'zod'
import { predictPrice } from '../lib/ml.js'

const DISTRICTS = ['yunusabad', 'mirzo-ulugbek', 'chilanzar', 'shaykhantakhur', 'yakkasaray', 'mirabad', 'sergeli', 'yashnabad', 'almazar', 'uchtepa', 'bektemir', 'yangihayot'] as const

const schema = z.object({
  district: z.enum(DISTRICTS),
  area_m2: z.number().gt(20).max(2000),
  land_sotka: z.number().gt(0).max(500),
  rooms: z.number().int().min(1).max(20),
  floors: z.number().int().min(1).max(5),
  building_type: z.enum(['brick', 'block', 'monolith']),
  renovation: z.enum(['none', 'basic', 'euro', 'designer']),
  year_built: z.number().int().min(1900).max(2026),
})

export const estimateRouter = Router()

/** Проверяет параметры и передаёт их в ml-сервис. */
estimateRouter.post('/', async (req, res) => {
  const body = schema.parse(req.body)
  const upstream = await predictPrice(body)
  res.json(await upstream.json())
})
