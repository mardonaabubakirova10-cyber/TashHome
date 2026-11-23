import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import sketchWide from '../assets/showcase/sketch-wide.webp'
import ctaPhoto from '../assets/showcase/cta.webp'
import sketch from '../assets/showcase/sketch.webp'
import assistantPhoto from '../assets/showcase/assistant.webp'
import BlueprintHouse from '../components/BlueprintHouse'
import HouseCarousel from '../components/HouseCarousel'
import Button from '../components/ui/Button'
import { Input, Select } from '../components/ui/Field'
import { DISTRICTS, PROPERTIES } from '../data/properties'

// «Пол» главного экрана: мелкие квадратные миниатюры домов. Уникальных адресов всего 36, остальное берётся из кеша браузера.
const COLS = 34
const ROWS = 14
const floor = Array.from({ length: COLS * ROWS }, (_, i) => {
  const photo = PROPERTIES[(i * 7 + Math.floor(i / COLS) * 13) % PROPERTIES.length].photo
  return { src: photo.replace('/800/600', '/160/160'), col: i % COLS }
})

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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-20">
      {/* Hero: заголовок и «пол» из наклонённых фотографий домов */}
      <div>
        <section className="relative isolate min-h-[36rem] overflow-hidden rounded-2xl bg-ink text-white sm:min-h-[44rem]">
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[64%] overflow-hidden [perspective:700px]"
            style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 55%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 55%)' }}
            aria-hidden
          >
            {/* Пол наклонён назад, а плитки у краёв приподняты: получается чаша, как горизонт, уходящий вверх */}
            <div
              className="absolute bottom-[-30%] left-1/2 grid w-[250%] origin-bottom gap-[3px]"
              style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, transform: 'translateX(-50%) rotateX(64deg)', transformStyle: 'preserve-3d' }}
            >
              {floor.map((tile, i) => {
                const dx = tile.col - (COLS - 1) / 2
                return (
                  <img
                    key={i}
                    src={tile.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full rounded-[2px] object-cover"
                    style={{ transform: `translateZ(${Math.round(dx * dx * 0.55)}px)` }}
                  />
                )
              })}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/30 via-transparent to-black/20" />

          <div className="relative z-20 flex flex-col items-center px-5 pt-16 text-center sm:pt-24">
            <p className="text-[0.7rem] font-medium uppercase tracking-[0.3em] text-white/60">{t('home.eyebrow')}</p>
            <h1
              className="mt-6 leading-[0.95]"
              // стили заданы прямо здесь: общее правило для h1 в index.css иначе перебило бы шрифт и толщину
              style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, letterSpacing: '-0.02em', fontSize: 'clamp(3rem, 9vw, 7.5rem)' }}
            >
              <span className="block">{t('home.heroLine1')}</span>
              <span className="block italic text-white/55">{t('home.heroLine2')}</span>
            </h1>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/catalog" className="inline-flex items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-brand-50">
                {t('home.toCatalog')} →
              </Link>
              <Link to="/assistant" className="inline-flex items-center rounded-full border border-white/25 bg-black/30 px-5 py-2.5 text-sm text-white backdrop-blur transition-colors hover:border-white/60">
                {t('home.askAssistant')}
              </Link>
            </div>
          </div>
        </section>

        <form
          onSubmit={onSearch}
          className="relative z-10 mx-0 mt-4 grid gap-3 rounded-xl bg-slate-100 p-4 text-slate-900 shadow-xl ring-1 ring-white/10 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
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
      <section className="relative isolate grid content-center gap-6 py-8 sm:grid-cols-3 sm:min-h-[19rem]">
        {/* эскиз на всю ширину блока: светлые линии на чёрном, края растворяются */}
        <img
          src={sketchWide}
          alt=""
          className="pointer-events-none absolute inset-0 -z-10 size-full max-w-none object-cover object-[50%_55%] opacity-45 mix-blend-screen"
          style={{
            filter: 'invert(1) grayscale(1) contrast(1.2) brightness(0.9)',
            maskImage: 'radial-gradient(ellipse 62% 70% at 50% 50%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 62% 70% at 50% 50%, black 40%, transparent 100%)',
          }}
        />
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
        <HouseCarousel items={PROPERTIES.filter((p) => p.dealType === 'sale').slice(0, 9)} />
      </section>

      {/* Районы */}
      <section>
        <SectionHead title={t('home.districts')} />
        {/* Бегущая лента районов: движется сама, при наведении останавливается */}
        <div
          className="marquee overflow-hidden py-1"
          style={{ maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)' }}
        >
          <div className="marquee-track flex w-max">
            {[...DISTRICTS, ...DISTRICTS].map((d, i) => {
              const copy = i >= DISTRICTS.length // вторая копия нужна только для бесшовной петли
              return (
                <Link
                  key={`${d.id}-${i}`}
                  to={`/catalog?district=${d.id}`}
                  aria-hidden={copy || undefined}
                  tabIndex={copy ? -1 : undefined}
                  className="mr-3 whitespace-nowrap rounded-full border border-slate-400 px-5 py-2 text-sm transition-colors hover:border-white hover:bg-white hover:text-ink"
                >
                  {districtName(d)}
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Преимущества: на фоне — архитектурный чертёж */}
      <section className="relative isolate">
        <BlueprintHouse className="absolute -right-8 -top-6 -z-10 hidden w-[36rem] text-white opacity-[0.34] md:block" />
        <SectionHead title={t('home.whyTitle')} />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {why.map((n) => (
            <div key={n}>
              <p className="font-display text-5xl text-slate-500">0{n}</p>
              <h3 className="mt-3 text-lg font-semibold">{t(`home.why${n}Title`)}</h3>
              <p className="mt-1 text-sm text-slate-600">{t(`home.why${n}Text`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ассистент */}
      <section className="relative isolate grid gap-8 overflow-hidden rounded-2xl bg-ink p-6 text-white sm:p-12 lg:min-h-[26rem] lg:grid-cols-2 lg:items-center">
        {/* фон: реальное фото дома, которое растворяется в чёрном слева */}
        <img
          src={assistantPhoto}
          alt=""
          className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-full object-cover object-[50%_35%] opacity-100 lg:w-[46%]"
          style={{ maskImage: 'linear-gradient(to left, black 50%, transparent 98%)', WebkitMaskImage: 'linear-gradient(to left, black 50%, transparent 98%)' }}
        />
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
                i % 2 === 0 ? 'rounded-bl-sm bg-black/45 text-white backdrop-blur-md ring-1 ring-white/10' : 'ml-auto rounded-br-sm bg-white/90 text-ink backdrop-blur-md'
              }`}
            >
              {t(`home.${k}`)}
            </div>
          ))}
        </div>
      </section>

      {/* Как это работает: чертёж другого дома */}
      <section className="relative isolate sm:min-h-[26rem]">
        {/* карандашный эскиз дома: инвертирован в светлые линии на чёрном и растворяется по краям */}
        <img
          src={sketch}
          alt=""
          className="pointer-events-none absolute inset-0 -z-10 size-full max-w-none object-cover object-[50%_42%] opacity-40 mix-blend-screen"
          style={{
            filter: 'invert(1) grayscale(1) contrast(1.15) brightness(0.8)',
            maskImage: 'radial-gradient(ellipse 62% 72% at 50% 50%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 62% 72% at 50% 50%, black 40%, transparent 100%)',
          }}
        />
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
      <section className="relative isolate flex min-h-[22rem] flex-col items-center justify-center overflow-hidden rounded-2xl bg-brand-500 px-6 py-14 text-center text-white">
        <img src={ctaPhoto} alt="" className="pointer-events-none absolute inset-0 -z-10 size-full object-cover object-[50%_40%]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black/60 via-black/50 to-black/60" />
        <h2 className="text-3xl sm:text-5xl">{t('home.ctaTitle')}</h2>
        <p className="mx-auto mt-3 max-w-md text-white">{t('home.ctaText')}</p>
        <Link to="/assistant" className={`${linkBtn} mt-7 bg-ink text-white hover:bg-slate-800`}>
          {t('home.askAssistant')}
        </Link>
      </section>
    </div>
  )
}
