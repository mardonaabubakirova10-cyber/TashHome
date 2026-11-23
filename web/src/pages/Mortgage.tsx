import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { Input } from '../components/ui/Field'
import { useCurrency } from '../lib/currency'
import { schedule } from '../lib/mortgage'

// Примерные значения для расчёта, не предложения банков. Настоящие программы подключим на шаге 2.5.
const PRESETS = [
  { id: 'standard', down: 30, term: 15, rate: 24 },
  { id: 'benefit', down: 20, term: 20, rate: 18 },
  { id: 'short', down: 50, term: 7, rate: 26 },
] as const

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const PREVIEW_ROWS = 12

export default function Mortgage() {
  const { t } = useTranslation()
  const { format } = useCurrency()
  const [price, setPrice] = useState(150000)
  const [down, setDown] = useState(30)
  const [years, setYears] = useState(15)
  const [rate, setRate] = useState(24)
  const [showAll, setShowAll] = useState(false)

  const p = Math.max(0, price)
  const d = clamp(down, 0, 90)
  const y = clamp(years, 1, 30)
  const r = clamp(rate, 0, 60)

  const downPayment = p * (d / 100)
  const loan = p - downPayment
  const rows = useMemo(() => schedule(loan, r, y), [loan, r, y])
  const monthly = rows[0]?.payment ?? 0
  const total = rows.reduce((s, row) => s + row.payment, 0)
  const overpay = total - loan
  const visible = showAll ? rows : rows.slice(0, PREVIEW_ROWS)

  const applyPreset = (x: (typeof PRESETS)[number]) => {
    setDown(x.down)
    setYears(x.term)
    setRate(x.rate)
  }

  const stats: Array<[string, string]> = [
    [t('mortgage.downPayment'), format(downPayment)],
    [t('mortgage.loan'), format(loan)],
    [t('mortgage.total'), format(total)],
    [t('mortgage.overpay'), format(overpay)],
  ]

  return (
    <div className="grid gap-8">
      <h1 className="text-3xl sm:text-4xl">{t('pages.mortgage')}</h1>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Card className="grid content-start gap-4 p-5">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">{t('mortgage.presets')}</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((x) => (
                <Button key={x.id} variant="secondary" size="sm" onClick={() => applyPreset(x)}>
                  {t(`mortgage.preset_${x.id}`)}
                </Button>
              ))}
            </div>
          </div>
          <Input label={t('mortgage.price')} type="number" min={0} inputMode="numeric" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          <div className="grid grid-cols-3 gap-3">
            <Input label={t('property.mortgage.down')} type="number" min={0} max={90} value={down} onChange={(e) => setDown(Number(e.target.value))} />
            <Input label={t('property.mortgage.term')} type="number" min={1} max={30} value={years} onChange={(e) => setYears(Number(e.target.value))} />
            <Input label={t('property.mortgage.rate')} type="number" min={0} max={60} value={rate} onChange={(e) => setRate(Number(e.target.value))} />
          </div>
          <p className="text-xs text-slate-500">{t('mortgage.disclaimer')}</p>
        </Card>

        <div className="grid content-start gap-4">
          <div className="rounded-lg bg-white/10 p-6">
            <p className="text-sm text-slate-600">{t('property.mortgage.monthly')}</p>
            <p className="font-display text-5xl font-semibold text-brand-100">{format(monthly)}</p>
          </div>
          <dl className="grid grid-cols-2 gap-4">
            {stats.map(([k, v]) => (
              <Card key={k} className="p-4">
                <dt className="text-sm text-slate-500">{k}</dt>
                <dd className="mt-1 text-xl font-semibold">{v}</dd>
              </Card>
            ))}
          </dl>
        </div>
      </div>

      <section>
        <h2 className="mb-4 text-2xl">{t('mortgage.schedule')}</h2>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">{t('mortgage.month')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('mortgage.payment')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('mortgage.interest')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('mortgage.principal')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('mortgage.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.month} className="border-b border-slate-200 last:border-0">
                  <td className="px-4 py-2.5">{row.month}</td>
                  <td className="px-4 py-2.5 text-right">{format(row.payment)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{format(row.interest)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{format(row.principal)}</td>
                  <td className="px-4 py-2.5 text-right">{format(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        {rows.length > PREVIEW_ROWS && (
          <div className="mt-4 text-center">
            <Button variant="secondary" onClick={() => setShowAll((v) => !v)}>
              {showAll ? t('mortgage.collapse') : t('mortgage.showAll', { count: rows.length })}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
