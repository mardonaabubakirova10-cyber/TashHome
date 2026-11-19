import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PropertyCard from '../components/PropertyCard'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { Input, Select } from '../components/ui/Field'
import { DISTRICTS, PROPERTIES } from '../data/properties'

const linkBtn = 'inline-flex items-center justify-center rounded-lg px-5 py-3 text-base font-medium transition-colors'

export default function Home() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [district, setDistrict] = useState('')
  const [rooms, setRooms] = useState('')
  const [price, setPrice] = useState('')

  const districtName = (d: (typeof DISTRICTS)[number]) => (i18n.language === 'uz' ? d.uz : d.ru)

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (district) p.set('district', district)
    if (rooms) p.set('rooms', rooms)
    if (price) p.set('priceTo', price)
    navigate(`/catalog?${p.toString()}`)
  }

  const stats = [
    { value: PROPERTIES.length, label: t('home.statHouses') },
    { value: DISTRICTS.length, label: t('home.statDistricts') },
    { value: '24/7', label: t('home.statSupport') },
  ]
  const why = [1, 2, 3, 4] as const
  const steps = [1, 2, 3] as const
  const examples = ['aiEx1', 'aiEx2', 'aiEx3'] as const

  return (
    <div className="grid gap-16">
      <section className="rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-5 py-14 text-white sm:px-10 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold sm:text-5xl">{t('home.title')}</h1>
          <p className="mx-auto mt-4 max-w-xl text-brand-100">{t('home.subtitle')}</p>
        </div>

        <form onSubmit={onSearch} className="mx-auto mt-8 grid max-w-4xl gap-3 rounded-xl bg-white p-4 text-slate-900 shadow-lg sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <Select label={t('filters.district')} value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">{t('filters.anyDistrict')}</option>
            {DISTRICTS.map((d) => (
              <option key={d.id} value={d.id}>
                {districtName(d)}
              </option>
            ))}
          </Select>
          <Select label={t('filters.rooms')} value={rooms} onChange={(e) => setRooms(e.target.value)}>
            <option value="">{t('filters.anyRooms')}</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6+</option>
          </Select>
          <Input label={t('filters.priceTo')} type="number" min={0} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Button type="submit" size="lg" className="sm:col-span-2 lg:col-span-1">
            {t('home.searchBtn')}
          </Button>
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {DISTRICTS.slice(0, 6).map((d) => (
            <Link
              key={d.id}
              to={`/catalog?district=${d.id}`}
              className="rounded-full border border-white/40 px-3 py-1 text-sm text-white hover:bg-white/10"
            >
              {districtName(d)}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-6 text-center">
            <p className="text-4xl font-bold text-brand-600">{s.value}</p>
            <p className="mt-1 text-sm text-slate-600">{s.label}</p>
          </Card>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('home.fresh')}</h2>
          <Link to="/catalog" className="text-sm font-medium text-brand-600 hover:underline">
            {t('home.all')}
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROPERTIES.slice(0, 6).map((item) => (
            <PropertyCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-center text-2xl font-bold">{t('home.whyTitle')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {why.map((n) => (
            <Card key={n} className="p-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-brand-50 font-bold text-brand-600">{n}</div>
              <h3 className="font-semibold">{t(`home.why${n}Title`)}</h3>
              <p className="mt-1 text-sm text-slate-600">{t(`home.why${n}Text`)}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('home.aiTitle')}</h2>
          <p className="mt-2 text-slate-600">{t('home.aiText')}</p>
          <Link to="/assistant" className={`${linkBtn} mt-5 bg-brand-500 text-white hover:bg-brand-600`}>
            {t('home.askAssistant')}
          </Link>
        </div>
        <div className="grid gap-2">
          {examples.map((k) => (
            <div key={k} className="rounded-xl rounded-bl-sm bg-brand-50 px-4 py-3 text-sm text-brand-700">
              {t(`home.${k}`)}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-center text-2xl font-bold">{t('home.stepsTitle')}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((n) => (
            <div key={n} className="text-center">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-white">{n}</div>
              <h3 className="font-semibold">{t(`home.step${n}Title`)}</h3>
              <p className="mt-1 text-sm text-slate-600">{t(`home.step${n}Text`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-slate-900 px-6 py-12 text-center text-white">
        <h2 className="text-2xl font-bold">{t('home.ctaTitle')}</h2>
        <p className="mx-auto mt-2 max-w-md text-slate-300">{t('home.ctaText')}</p>
        <Link to="/assistant" className={`${linkBtn} mt-6 bg-white text-slate-900 hover:bg-slate-100`}>
          {t('home.askAssistant')}
        </Link>
      </section>
    </div>
  )
}
