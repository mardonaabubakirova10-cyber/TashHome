import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PropertyCard from '../components/PropertyCard'
import Button from '../components/ui/Button'
import { Input, Select } from '../components/ui/Field'
import { DISTRICTS, PROPERTIES } from '../data/properties'

const linkBtn = 'inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-medium transition-colors'
const photoTone = 'size-full object-cover sepia-[.25]'

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
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-ink text-white">
        <div className="grid gap-10 p-6 sm:p-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-brand-100">{t('home.eyebrow')}</p>
            <h1 className="mt-5 text-5xl leading-[1.05] sm:text-7xl">{t('home.title')}</h1>
            <p className="mt-5 max-w-md text-slate-300">{t('home.subtitle')}</p>

            <form
              onSubmit={onSearch}
              className="mt-8 grid gap-3 rounded-xl bg-white p-4 text-slate-900 sm:grid-cols-3 sm:items-end"
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
              <Button type="submit" size="lg" className="sm:col-span-3">
                {t('home.searchBtn')}
              </Button>
            </form>
          </div>

          {/* Коллаж фото: на телефоне — две рядом, на компьютере — с наложением */}
          <div className="grid grid-cols-2 gap-3 lg:relative lg:block lg:min-h-[34rem]">
            <div className="aspect-[3/4] overflow-hidden rounded-lg lg:absolute lg:right-0 lg:top-0 lg:w-[72%]">
              <img src={PROPERTIES[1].photos[0]} alt="" className={photoTone} />
            </div>
            <div className="aspect-[3/4] overflow-hidden rounded-lg lg:absolute lg:bottom-0 lg:left-0 lg:aspect-[4/3] lg:w-[58%] lg:border-[10px] lg:border-ink">
              <img src={PROPERTIES[2].photos[0]} alt="" className={photoTone} />
            </div>
          </div>
        </div>
      </section>

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
