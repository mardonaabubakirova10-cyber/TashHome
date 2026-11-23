import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { Input, Select } from '../components/ui/Field'
import { DISTRICTS } from '../data/properties'
import { estimate, type EstimateInput } from '../lib/estimateApi'
import { useCurrency } from '../lib/currency'

const FACTOR_KEYS: Record<string, string> = {
  district: 'district', building_type: 'material', area_m2: 'area', land_sotka: 'land', rooms: 'rooms',
  floors: 'floors', age: 'age', area_per_room: 'areaPerRoom', renovation_level: 'renovation',
}

export default function Estimate() {
  const { t, i18n } = useTranslation()
  const { format } = useCurrency()
  const [f, setF] = useState({
    district: 'yunusabad', area_m2: '150', land_sotka: '6', rooms: '4', floors: '2',
    building_type: 'brick', renovation: 'euro', year_built: '2012',
  })
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }))

  const m = useMutation({ mutationFn: (x: EstimateInput) => estimate(x) })
  const r = m.data

  const submit = (e: FormEvent) => {
    e.preventDefault()
    m.mutate({
      district: f.district, building_type: f.building_type, renovation: f.renovation,
      area_m2: Number(f.area_m2), land_sotka: Number(f.land_sotka), rooms: Number(f.rooms),
      floors: Number(f.floors), year_built: Number(f.year_built),
    })
  }

  const maxEffect = r ? Math.max(...r.factors.map((x) => Math.abs(x.effect_pct)), 1) : 1

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-3xl sm:text-4xl">{t('pages.estimate')}</h1>
        <p className="mt-2 max-w-2xl text-slate-600">{t('estimate.intro')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <Card className="p-5">
          <form onSubmit={submit} className="grid gap-4">
            <Select label={t('estimate.district')} value={f.district} onChange={set('district')}>
              {DISTRICTS.map((d) => <option key={d.id} value={d.id}>{i18n.language === 'uz' ? d.uz : d.ru}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('property.area')} type="number" required min={21} max={2000} value={f.area_m2} onChange={set('area_m2')} />
              <Input label={t('property.land')} type="number" required min={0.5} max={500} step="0.5" value={f.land_sotka} onChange={set('land_sotka')} />
              <Input label={t('property.rooms')} type="number" required min={1} max={20} value={f.rooms} onChange={set('rooms')} />
              <Input label={t('property.floors')} type="number" required min={1} max={5} value={f.floors} onChange={set('floors')} />
            </div>
            <Select label={t('property.material')} value={f.building_type} onChange={set('building_type')}>
              {['brick', 'block', 'monolith'].map((b) => <option key={b} value={b}>{t(`building.${b}`)}</option>)}
            </Select>
            <Select label={t('property.renovation')} value={f.renovation} onChange={set('renovation')}>
              {['none', 'basic', 'euro', 'designer'].map((x) => <option key={x} value={x}>{t(`renovation.${x}`)}</option>)}
            </Select>
            <Input label={t('property.year')} type="number" required min={1900} max={2026} value={f.year_built} onChange={set('year_built')} />
            <Button type="submit" size="lg" disabled={m.isPending}>
              {m.isPending ? t('estimate.loading') : t('estimate.submit')}
            </Button>
          </form>
        </Card>

        <div className="grid content-start gap-4" aria-live="polite">
          {m.isError && (
            <Card className="border-red-500/40 p-5">
              <p className="font-medium text-red-600">{t('estimate.errorTitle')}</p>
              <p className="mt-1 text-sm text-slate-600">{t('estimate.errorText')}</p>
            </Card>
          )}
          {!r && !m.isError && <Card className="p-6 text-slate-600">{t('estimate.empty')}</Card>}
          {r && (
            <>
              <div className="rounded-lg bg-white/10 p-6">
                <p className="text-sm text-slate-600">{t('estimate.result')}</p>
                <p className="font-display text-5xl font-semibold text-brand-100">{format(r.predicted_price)}</p>
                <p className="mt-2 text-sm text-slate-600">
                  {t('estimate.range', { low: format(r.price_low), high: format(r.price_high) })}
                </p>
                <p className="text-sm text-slate-600">{t('estimate.perM2', { price: format(r.price_per_m2) })}</p>
              </div>

              <Card className="p-5">
                <h2 className="text-xl">{t('estimate.factors')}</h2>
                <p className="mb-3 mt-1 text-sm text-slate-500">{t('estimate.factorsHint')}</p>
                <ul className="grid gap-3">
                  {r.factors.map((x) => (
                    <li key={x.feature}>
                      <div className="flex justify-between text-sm">
                        <span>{t(`estimate.f_${FACTOR_KEYS[x.feature] ?? x.feature}`)}</span>
                        <span className={x.effect_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                          {x.effect_pct > 0 ? '+' : ''}{x.effect_pct} %
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={x.effect_pct >= 0 ? 'h-full bg-emerald-500' : 'h-full bg-red-500'}
                          style={{ width: `${(Math.abs(x.effect_pct) / maxEffect) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>

              <p className="text-xs text-slate-500">{t('estimate.disclaimer')}</p>
              <Link to="/catalog" className="text-sm text-brand-100 hover:underline">{t('estimate.toCatalog')}</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
