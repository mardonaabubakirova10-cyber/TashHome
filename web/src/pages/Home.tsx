import { lazy, Suspense, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import HouseTicket from '../components/HouseTicket'
import Button from '../components/ui/Button'
import { Input, Select } from '../components/ui/Field'
import { DISTRICTS, PROPERTIES } from '../data/properties'

// Карта тянет Leaflet, поэтому грузится отдельным файлом
const HeroMap = lazy(() => import('../components/HeroMap'))

const linkBtn = 'inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-medium transition-colors'

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
      {/* Hero: тёмная карта, поверх две наложенные надписи разных цветов */}
      <div>
        <section className="relative isolate min-h-[34rem] overflow-hidden rounded-2xl bg-ink text-white [container-type:inline-size] sm:min-h-[40rem]">
          <div className="absolute inset-0 isolate z-0">
            <Suspense fallback={null}>
              <HeroMap />
            </Suspense>
          </div>
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-black/20 to-black/75" />

          <h1
            aria-label="TashHome"
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center font-medium uppercase leading-none tracking-tight"
            style={{ fontSize: 'clamp(3.25rem, 14cqw, 14rem)' }}
          >
            <span aria-hidden className="text-white">
              Tash
            </span>
            <span
              aria-hidden
              className="-ml-[0.45em] translate-y-[0.12em] bg-clip-text text-transparent [filter:drop-shadow(0_0_0.1em_rgba(0,0,0,0.6))]"
              style={{ backgroundImage: 'linear-gradient(135deg, #ffd3b0 0%, #ec6f3d 50%, #8f2f10 100%)' }}
            >
              Home
            </span>
          </h1>

          <div className="absolute bottom-6 left-5 z-30 max-w-[15rem] sm:bottom-10 sm:left-10">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-brand-100">{t('home.eyebrow')}</p>
            <p className="mt-2 text-sm text-white/90">{t('home.subtitle')}</p>
            <Link to="/catalog" className="mt-4 inline-flex rounded-md bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-brand-50">
              {t('home.toCatalog')}
            </Link>
          </div>
        </section>

        <form
          onSubmit={onSearch}
          className="relative z-10 mx-4 -mt-8 grid gap-3 rounded-xl bg-slate-100 p-4 text-slate-900 shadow-xl ring-1 ring-white/10 sm:mx-10 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
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
            <Link to="/catalog" className="whitespace-nowrap text-sm font-medium text-brand-100 hover:underline">
              {t('home.all')} →
            </Link>
          }
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PROPERTIES.slice(0, 6).map((item) => (
            <HouseTicket key={item.id} item={item} />
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
              className="rounded-full border border-slate-400 px-5 py-2 text-sm transition-colors hover:border-white hover:bg-white hover:text-ink"
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
          <p className="mt-3 max-w-md text-white/70">{t('home.aiText')}</p>
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
              <p className="font-display text-6xl leading-none text-slate-400">{n}</p>
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
        <p className="mx-auto mt-3 max-w-md text-white">{t('home.ctaText')}</p>
        <Link to="/assistant" className={`${linkBtn} mt-7 bg-ink text-white hover:bg-slate-800`}>
          {t('home.askAssistant')}
        </Link>
      </section>
    </div>
  )
}
