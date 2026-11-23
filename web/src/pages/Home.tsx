import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ctaPhoto from '../assets/showcase/cta.webp'
import BlueprintStreet from '../components/BlueprintStreet'
import BlueprintHouse from '../components/BlueprintHouse'
import { scrollProgress, stageOf } from '../lib/scrollProgress'
import HouseCarousel from '../components/HouseCarousel'
import Button from '../components/ui/Button'
import { Input, Select } from '../components/ui/Field'
import { DISTRICTS, PROPERTIES } from '../data/properties'

// «Пол» главного экрана: мелкие квадратные миниатюры домов. Уникальных адресов всего 36, остальное берётся из кеша браузера.
// 3D-сцена тянет Three.js, поэтому грузится отдельным файлом
const GlassCubes = lazy(() => import('../components/GlassCubes'))

const HouseBuild3D = lazy(() => import('../components/HouseBuild3D'))

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

  // стадия блока «Как это работает» (0, 1, 2) по прокрутке: подсвечивает нужный шаг
  const stepsRef = useRef<HTMLElement>(null)
  const [stage, setStage] = useState<0 | 1 | 2>(0)
  useEffect(() => {
    const onScroll = () => {
      if (stepsRef.current) setStage(stageOf(scrollProgress(stepsRef.current)))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

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
        {/* чертёж улицы на всю ширину блока: края растворяются в чёрном */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
          }}
        >
          <BlueprintStreet className="size-full text-white opacity-[0.36]" />
        </div>
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
        {/* фон: 3D-облако стеклянных кубов с фото домов, грузится отдельным файлом */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-full lg:w-[58%]"
          style={{ backgroundImage: 'radial-gradient(60% 70% at 55% 50%, rgba(90,110,255,0.22), transparent 70%)' }}
        >
          <Suspense fallback={null}>
            <GlassCubes className="size-full" />
          </Suspense>
        </div>
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

      {/* Как это работает: 3D-дом строится вместе с прокруткой, а шаги слева подсвечиваются по стадиям */}
      <section ref={stepsRef} className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <SectionHead title={t('home.stepsTitle')} />
          <ol className="grid gap-6">
            {steps.map((n) => {
              const active = stage === n - 1
              return (
                <li key={n} className={`flex gap-4 transition-opacity duration-500 ${active ? 'opacity-100' : 'opacity-45'}`}>
                  <p className={`font-display text-6xl leading-none transition-colors duration-500 ${active ? 'text-white' : 'text-slate-400'}`}>{n}</p>
                  <div>
                    <h3 className="text-lg font-semibold">{t(`home.step${n}Title`)}</h3>
                    <p className="mt-1 text-sm text-slate-600">{t(`home.step${n}Text`)}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
        <div
          className="relative h-[22rem] sm:h-[28rem]"
          style={{ backgroundImage: 'radial-gradient(55% 60% at 50% 55%, rgba(110,130,255,0.16), transparent 70%)' }}
        >
          <Suspense fallback={null}>
            <HouseBuild3D className="size-full" />
          </Suspense>
        </div>
      </section>

      {/* Призыв */}
      <section className="relative isolate flex min-h-[22rem] flex-col items-center justify-center overflow-hidden rounded-2xl bg-brand-500 px-6 py-14 text-center text-white">
        <img src={ctaPhoto} alt="" className="pointer-events-none absolute inset-0 -z-10 size-full scale-110 object-cover object-[50%_40%] blur-[1.5px]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black/45 via-black/35 to-black/55" />
        <h2 className="text-3xl sm:text-5xl">{t('home.ctaTitle')}</h2>
        <p className="mx-auto mt-3 max-w-md text-white">{t('home.ctaText')}</p>
        <Link to="/assistant" className={`${linkBtn} mt-7 bg-ink text-white hover:bg-slate-800`}>
          {t('home.askAssistant')}
        </Link>
      </section>
    </div>
  )
}
