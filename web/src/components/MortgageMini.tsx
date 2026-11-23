import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '../lib/currency'
import { monthlyPayment } from '../lib/mortgage'
import Card from './ui/Card'
import { Input } from './ui/Field'

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export default function MortgageMini({ priceUsd }: { priceUsd: number }) {
  const { t } = useTranslation()
  const { format } = useCurrency()
  // Значения по умолчанию ориентировочные; реальные программы банков подключим на шаге 2.5
  const [down, setDown] = useState(30)
  const [years, setYears] = useState(15)
  const [rate, setRate] = useState(24)

  const principal = priceUsd * (1 - clamp(down, 0, 90) / 100)
  const payment = monthlyPayment(principal, clamp(rate, 0, 60), clamp(years, 1, 30))

  return (
    <Card className="grid gap-3 p-5">
      <h2 className="text-lg font-semibold">{t('property.mortgage.title')}</h2>
      <div className="grid grid-cols-3 gap-2">
        <Input label={t('property.mortgage.down')} type="number" min={0} max={90} value={down} onChange={(e) => setDown(Number(e.target.value))} />
        <Input label={t('property.mortgage.term')} type="number" min={1} max={30} value={years} onChange={(e) => setYears(Number(e.target.value))} />
        <Input label={t('property.mortgage.rate')} type="number" min={0} max={60} value={rate} onChange={(e) => setRate(Number(e.target.value))} />
      </div>
      <div className="rounded-lg bg-white/10 p-4">
        <p className="text-sm text-slate-600">{t('property.mortgage.monthly')}</p>
        <p className="text-2xl font-bold text-brand-100">{format(payment)}</p>
      </div>
      <p className="text-xs text-slate-500">{t('property.mortgage.disclaimer')}</p>
    </Card>
  )
}
