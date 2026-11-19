import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PropertyCard from '../components/PropertyCard'
import Button from '../components/ui/Button'
import { Input, Select } from '../components/ui/Field'
import { DISTRICTS, PROPERTIES } from '../data/properties'

const linkBtn = 'inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-medium transition-colors'
const HERO_PHOTO = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1800&q=80' // замените на своё фото

function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4 border-b border-slate-300 pb-4">
      <h2 className="text-3xl sm:text-4xl">{title}</h2>
      {action}
    </div>
  )
}

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
    <div className="grid gap-20">
      {/* Hero: огромные слова по углам поверх фото */}
      <div>
        <section className="relative isolate min-h-[32rem] overflow-hidden rounded-2xl bg-ink text-white sm:min-h-[42rem]">
          <img src={HERO_PHOTO} alt="" className="absolute inset-0 -z-20 size-full object-cover sepia-[.2]" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/35 via-black/5 to-black/50" />

          <h1 aria-label="TashHome" className="font-medium uppercase leading-[0.85] tracking-tight">
            <span aria-hidden className="absolute left-5 top-5 text-[clamp(5rem,21vw,16rem)] sm:left-10 sm:top-8">
              Tash
            </span>
            <span aria-hidden className="absolute bottom-5 right-5 text-[clamp(5rem,21vw,16rem)] sm:bottom-8 sm:right-10">
              Home
            </span>
          </h1>

          <div className="absolute left-5 top-[40%] max-w-[15rem] sm:bottom-10 sm:left-10 sm:top-auto">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-brand-100">{t('home.eyebrow')}</p>
            <p className="mt-2 text-sm text-white/90">{t('home.subtitle')}</p>
            <Link to="/catalog" className="mt-4 inline-flex rounded-md bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-brand-50">
              {t('home.toCatalog')}
            </Link>
          </div>
        </section>

        <form
          onSubmit={onSearch}
          className="relative z-10 mx-4 -mt-8 grid gap-3 rounded-xl bg-white p-4 text-slate-900 shadow-xl ring-1 ring-black/5 sm:mx-10 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
        >
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
          <Input
            label={t('filters.priceTo')}
            type="number"
            min={0}
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Button type="submit" size="lg">
            {t('home.searchBtn')}
          </Button>
        </form>
      </div>

      {/* Цифры */}
      <section className="grid gap-6 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="border-t border-slate-900 pt-4">
            <p className="font-display text-6xl font-semibold">{s.value}</p>
            <p className="mt-2 text-sm uppercase tracking-wider text-slate-600">{s.label}</p>
          </div>
        ))}
      </section>

      {/* Свежие дома */}
      <section>
        <SectionHead
          title={t('home.fresh')}
          action={
            <Link to="/catalog" className="whitespace-nowrap text-sm font-medium text-brand-600 hover:underline">
              {t('home.all')} →
            </Link>
          }
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PROPERTIES.slice(0, 6).map((item) => (
            <PropertyCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* Районы */}
      <section>
        <SectionHead title={t('home.districts')} />
        <div className="flex flex-wrap gap-3">
          {DISTRICTS.map((d) => (
            <Link
              key={d.id}
              to={`/catalog?district=${d.id}`}
              className="rounded-full border border-slate-400 px-5 py-2 text-sm transition-colors hover:border-ink hover:bg-ink hover:text-white"
            >
              {districtName(d)}
            </Link>
          ))}
        </div>
      </section>

      {/* Преимущества */}
      <section>
        <SectionHead title={t('home.whyTitle')} />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {why.map((n) => (
            <div key={n}>
              <p className="font-display text-5xl text-brand-500">0{n}</p>
              <h3 className="mt-3 text-lg font-semibold">{t(`home.why${n}Title`)}</h3>
              <p className="mt-1 text-sm text-slate-600">{t(`home.why${n}Text`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ассистент */}
      <section className="grid gap-8 rounded-2xl bg-ink p-6 text-white sm:p-12 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-3xl sm:text-4xl">{t('home.aiTitle')}</h2>
          <p className="mt-3 max-w-md text-slate-300">{t('home.aiText')}</p>
          <Link to="/assistant" className={`${linkBtn} mt-6 bg-brand-500 text-white hover:bg-brand-600`}>
            {t('home.askAssistant')}
          </Link>
        </div>
        <div className="grid gap-3">
          {examples.map((k, i) => (
            <div
              key={k}
              className={`max-w-[90%] rounded-2xl px-5 py-3 text-sm ${
                i % 2 === 0 ? 'rounded-bl-sm bg-white/10 text-white' : 'ml-auto rounded-br-sm bg-brand-500 text-white'
              }`}
            >
              {t(`home.${k}`)}
            </div>
          ))}
        </div>
      </section>

      {/* Как это работает */}
      <section>
        <SectionHead title={t('home.stepsTitle')} />
        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((n) => (
            <div key={n} className="flex gap-4">
              <p className="font-display text-6xl leading-none text-slate-300">{n}</p>
              <div>
                <h3 className="text-lg font-semibold">{t(`home.step${n}Title`)}</h3>
                <p className="mt-1 text-sm text-slate-600">{t(`home.step${n}Text`)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Призыв */}
      <section className="rounded-2xl bg-brand-500 px-6 py-14 text-center text-white">
        <h2 className="text-3xl sm:text-5xl">{t('home.ctaTitle')}</h2>
        <p className="mx-auto mt-3 max-w-md text-brand-100">{t('home.ctaText')}</p>
        <Link to="/assistant" className={`${linkBtn} mt-7 bg-ink text-white hover:bg-slate-800`}>
          {t('home.askAssistant')}
        </Link>
      </section>
    </div>
  )
}
