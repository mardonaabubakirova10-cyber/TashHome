import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Reviews from '../components/Reviews'
import BlueprintStreet from '../components/BlueprintStreet'
import BlueprintHouse from '../components/BlueprintHouse'
import { scrollProgress, stageOf } from '../lib/scrollProgress'
import HouseCarousel from '../components/HouseCarousel'
import Button from '../components/ui/Button'
import { Input, Select } from '../components/ui/Field'
import { HOUSE_PHOTOS } from '../data/photos'
import { DISTRICTS } from '../data/properties'
import { useHomeHouses, useTotalHouses } from '../lib/queries'

// «Пол» главного экрана: мелкие квадратные миниатюры домов. Уникальных адресов всего 36, остальное берётся из кеша браузера.
// 3D-сцена тянет Three.js, поэтому грузится отдельным файлом
const GlassCubes = lazy(() => import('../components/GlassCubes'))

const HouseBlueprint3D = lazy(() => import('../components/HouseBlueprint3D'))
const HouseBuild3D = lazy(() => import('../components/HouseBuild3D'))

// Плавный переход мозаики в чёрный фон: сверху к горизонту, по краям — в стороны (ступени подобраны, чтобы не было видно границы)
const FADE_Y = 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.06) 8%, rgba(0,0,0,0.22) 18%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.85) 42%, black 54%)'
const FADE_X = 'linear-gradient(to right, black, black)' // по бокам затухания нет

// на телефоне плиток меньше (размер плитки тот же): иначе страница долго отрисовывается
const MOBILE = typeof window !== 'undefined' && window.innerWidth < 640
const COLS = MOBILE ? 22 : 34
const ROWS = MOBILE ? 12 : 18
const floor = Array.from({ length: COLS * ROWS }, (_, i) => {
  const row = Math.floor(i / COLS)
  // для мозаики берём маленькие копии (public/houses/thumb): плитка на экране около 60 px, полный кадр не нужен
  // дальние ряды проявляются постепенно: край ковра уходит в темноту по глубине, в том числе у приподнятых боковин
  const fade = Math.pow(Math.min(1, row / (ROWS * 0.5)), 1.4)
  return { src: HOUSE_PHOTOS[(i * 7 + row * 13) % HOUSE_PHOTOS.length].replace('/houses/', '/houses/thumb/'), col: i % COLS, fade }
})

const linkBtn = 'inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-medium transition-colors'

function SectionHead({ title, action, bare }: { title: string; action?: ReactNode; bare?: boolean }) {
  return (
    <div className={`mb-8 flex items-end justify-between gap-4 pb-4 ${bare ? '' : 'border-b border-slate-300'}`}>
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

  const total = useTotalHouses().data
  const fresh = useHomeHouses().data?.items.slice(0, 9) ?? []
  const stats = [
    { value: total ?? '—', label: t('home.statHouses') },
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
        <section className="relative isolate -mt-8 min-h-[36rem] w-screen max-w-none overflow-hidden bg-ink text-white sm:min-h-[44rem] lg:min-h-[calc(100svh-3.6rem)] [margin-inline:calc(50%-50vw)]">
          {/* Затухание делаем на внешних слоях: маска на элементе с perspective в 3D не срабатывает */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[70%]" style={{ maskImage: FADE_Y, WebkitMaskImage: FADE_Y }} aria-hidden>
           <div className="h-full w-full" style={{ maskImage: FADE_X, WebkitMaskImage: FADE_X }}>
            <div className="h-full w-full overflow-hidden [perspective:700px]">
            {/* Пол наклонён назад, а плитки у краёв приподняты: получается чаша, как горизонт, уходящий вверх */}
            <div
              className="absolute bottom-[-30%] left-1/2 grid w-[250%] origin-bottom gap-[3px]"
              style={{ width: MOBILE ? `${Math.round((250 * COLS) / 34)}%` : undefined, gridTemplateColumns: `repeat(${COLS}, 1fr)`, transform: 'translateX(-50%) rotateX(68deg)', transformStyle: 'preserve-3d' }}
            >
              {floor.map((tile, i) => {
                const dx = tile.col - (COLS - 1) / 2
                return (
                  <img
                    key={i}
                    src={tile.src}
                    alt=""
                    decoding="async"
                    className="aspect-square w-full rounded-[3px] object-cover shadow-[0_3px_8px_rgba(0,0,0,0.75)]"
                    style={{ transform: `translateZ(${Math.round(dx * dx * 0.55)}px)`, opacity: tile.fade }}
                  />
                )
              })}
            </div>
            </div>
           </div>
          </div>
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/30 via-transparent to-black/20" />
          {/* тень: ковёр темнеет к горизонту (боковых теней нет) */}
          <div className="pointer-events-none absolute inset-0 z-10" style={{ backgroundImage: 'linear-gradient(to bottom, rgba(17,17,17,0.9) 0%, rgba(17,17,17,0) 42%)' }} />

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
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
          }}
        >
          {/* три одинаковых листа подряд едут влево: сдвиг на один лист даёт бесшовную петлю */}
          <div className="blueprint-pan flex h-full w-max text-white opacity-[0.36]">
            {[0, 1, 2].map((i) => (
              <BlueprintStreet key={i} className="aspect-[1200/320] h-full shrink-0" />
            ))}
          </div>
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
        {fresh.length > 0 && <HouseCarousel items={fresh} />}
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
      <section ref={stepsRef} className="relative isolate grid gap-8 lg:grid-cols-2 lg:items-center">
        {/* пол из сетки на весь блок: продолжает сетку 3D-сцены и уходит под текст шагов */}
        <div
          className="pointer-events-none absolute -inset-x-6 bottom-[-2rem] -z-10 h-[78%] overflow-hidden [perspective:640px]"
          style={{
            maskImage: 'linear-gradient(to top, black 15%, transparent 95%)',
            WebkitMaskImage: 'linear-gradient(to top, black 15%, transparent 95%)',
          }}
          aria-hidden
        >
          <div
            className="absolute -inset-x-[40%] bottom-[-10%] h-[210%] origin-bottom"
            style={{
              transform: 'rotateX(66deg)',
              backgroundImage:
                'linear-gradient(rgba(138,150,200,0.38) 1px, transparent 1px), linear-gradient(90deg, rgba(138,150,200,0.38) 1px, transparent 1px)',
              backgroundSize: '52px 52px',
            }}
          />
        </div>
        <div>
          <SectionHead title={t('home.stepsTitle')} bare />
          <ol className="grid gap-6">
            {steps.map((n) => {
              const active = stage === n - 1
              return (
                <li key={n} className={`flex gap-4 transition-opacity duration-500 ${active ? 'opacity-100' : 'opacity-70'}`}>
                  <p className={`w-14 shrink-0 font-display text-6xl leading-none transition-colors duration-500 ${active ? 'text-white' : 'text-slate-400'}`}>{n}</p>
                  <div>
                    <h3 className="text-lg font-semibold">{t(`home.step${n}Title`)}</h3>
                    <p className="mt-1 text-sm text-slate-600">{t(`home.step${n}Text`)}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
        {/* сцена выходит за границы колонки влево, а края растворяются, поэтому резкой границы между текстом и 3D нет */}
        <div
          className="relative h-[22rem] sm:h-[30rem] lg:-ml-20 lg:w-[calc(100%+5rem)]"
          style={{
            maskImage: 'radial-gradient(ellipse closest-side at 50% 50%, black 55%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse closest-side at 50% 50%, black 55%, transparent 100%)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundImage: 'radial-gradient(55% 60% at 50% 55%, rgba(110,130,255,0.16), transparent 70%)' }}
          />
          <Suspense fallback={null}>
            <HouseBuild3D className="size-full" />
          </Suspense>
        </div>
      </section>

      <Reviews />

      {/* Призыв */}
      <section className="relative isolate flex min-h-[22rem] flex-col items-center justify-center overflow-hidden rounded-2xl bg-ink px-6 py-14 text-center text-white ring-1 ring-white/10">
        {/* неподвижный 3D-чертёж двух домов на сетке; края растворяются в чёрном */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            maskImage: 'radial-gradient(ellipse 85% 90% at 50% 55%, black 45%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 85% 90% at 50% 55%, black 45%, transparent 100%)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundImage: 'radial-gradient(55% 60% at 50% 60%, rgba(110,130,255,0.16), transparent 70%)' }}
          />
          <Suspense fallback={null}>
            <HouseBlueprint3D className="size-full opacity-45" />
          </Suspense>
        </div>
        {/* тёмное пятно за текстом: надпись и кнопка не сливаются с линиями чертежа */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ backgroundImage: 'radial-gradient(ellipse 48% 62% at 50% 52%, rgba(0,0,0,0.88), rgba(0,0,0,0.55) 60%, transparent 100%)' }}
        />
        <h2 className="text-3xl sm:text-5xl">{t('home.ctaTitle')}</h2>
        <p className="mx-auto mt-3 max-w-md text-white">{t('home.ctaText')}</p>
        <Link to="/assistant" className={`${linkBtn} mt-7 bg-white text-ink hover:bg-brand-50`}>
          {t('home.askAssistant')}
        </Link>
      </section>
    </div>
  )
}
