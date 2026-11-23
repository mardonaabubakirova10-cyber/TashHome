import { Router } from 'express'
import { z } from 'zod'
import { schedule } from '../lib/mortgage.js'

// Примерные условия для расчёта, не предложения банков. Настоящие программы добавим вместе с базой (этап 1).
export const PROGRAMS = [
  { id: 'standard', name_ru: 'Стандартная', name_uz: 'Standart', down_percent: 30, term_years: 15, rate_percent: 24 },
  { id: 'benefit', name_ru: 'Льготная', name_uz: 'Imtiyozli', down_percent: 20, term_years: 20, rate_percent: 18 },
  { id: 'short', name_ru: 'Короткая', name_uz: 'Qisqa', down_percent: 50, term_years: 7, rate_percent: 26 },
]

const calcSchema = z.object({
  price: z.number().positive().max(10_000_000_000),
  down_percent: z.number().min(0).max(90),
  term_years: z.number().min(1).max(30),
  rate_percent: z.number().min(0).max(60),
})

export const mortgageRouter = Router()

mortgageRouter.get('/programs', (_req, res) => {
  res.json(PROGRAMS)
})

mortgageRouter.post('/calc', (req, res) => {
  const { price, down_percent, term_years, rate_percent } = calcSchema.parse(req.body)
  const down = (price * down_percent) / 100
  const loan = price - down
  const rows = schedule(loan, rate_percent, term_years)
  const total = rows.reduce((s, r) => s + r.payment, 0)
  res.json({
    down_payment: Math.round(down),
    loan: Math.round(loan),
    monthly: Math.round(rows[0]?.payment ?? 0),
    total: Math.round(total),
    overpayment: Math.round(total - loan),
    schedule: rows.map((r) => ({
      month: r.month,
      payment: Math.round(r.payment),
      interest: Math.round(r.interest),
      principal: Math.round(r.principal),
      balance: Math.round(r.balance),
    })),
  })
})
