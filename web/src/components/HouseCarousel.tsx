import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DISTRICTS, type Property } from '../data/properties'
import { useCurrency } from '../lib/currency'
import { LabelBadge } from './PriceLabelBadge'
import { propertyEstimate } from '../lib/priceLabel'

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Изогнутая карусель домов: карточки стоят на дуге, центральная смотрит прямо, боковые повёрнуты к зрителю.
 * Листается стрелками, перетаскиванием, горизонтальной прокруткой и клавишами ← →.
 */
export default function HouseCarousel({ items }: { items: Property[] }) {
  const { t, i18n } = useTranslation()
  const { format } = useCurrency()
  const navigate = useNavigate()
  const stage = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1000)
  const [pos, setPos] = useState(0) // положение: целое в покое, дробное во время перетаскивания
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null)
  const wasDragged = useRef(false) // чтобы клик после перетаскивания не открывал дом
  const last = items.length - 1

  // Ширина карточки зависит от ширины блока
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  // Карточки широкие и стыкуются в одну дугу: каждая стоит на окружности радиуса R и смотрит на центр
  const cardW = clamp(width * 0.46, 250, 600)
  const cardH = cardW * 0.64
  const ANGLE = 30 // на сколько градусов карточка отстоит от соседней
  const R = cardW / (2 * Math.sin((ANGLE / 2) * (Math.PI / 180))) // при таком радиусе соседние края сходятся
  const step = cardW * 0.8 // сколько пикселей перетаскивания равно одной карточке

  const go = (i: number) => setPos(clamp(Math.round(i), 0, last))
  const current = clamp(Math.round(pos), 0, last)

  const onPointerDown = (e: PointerEvent) => {
    drag.current = { x: e.clientX, start: pos, moved: false }
  }
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 6) {
      d.moved = true
      setDragging(true)
    }
    if (d.moved) setPos(clamp(d.start - dx / step, 0, last))
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    setDragging(false)
    if (d?.moved) {
      wasDragged.current = true
      setTimeout(() => (wasDragged.current = false), 0)
      go(pos)
    }
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(current + 1)
    if (e.key === 'ArrowLeft') go(current - 1)
  }
  const onWheel = (e: React.WheelEvent) => {
    // перехватываем только горизонтальную прокрутку, вертикальная остаётся у страницы
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 4) go(current + Math.sign(e.deltaX))
  }

  const district = (id: string) => {
    const d = DISTRICTS.find((x) => x.id === id)
    return d ? (i18n.language === 'uz' ? d.uz : d.ru) : ''
  }

  const item = items[current]

  return (
    <div>
      <div
        ref={stage}
        role="group"
        aria-roledescription="carousel"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative cursor-grab touch-pan-y select-none overflow-hidden rounded-2xl bg-ink outline-none ring-1 ring-white/10 focus-visible:ring-2 focus-visible:ring-white/50 active:cursor-grabbing"
        style={{ height: cardH + 150, perspective: `${Math.round(R * 1.05)}px`, perspectiveOrigin: '50% 45%' }}
      >
        {/* «пол» с лёгкой сеткой, как в референсе */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            transform: 'rotateX(70deg) scale(2)',
            transformOrigin: 'center bottom',
            maskImage: 'linear-gradient(to top, black, transparent)',
            WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
          }}
          aria-hidden
        />
        <div className="absolute inset-0" style={{ transformStyle: 'preserve-3d', transform: `translateZ(${Math.round(R)}px)` }}>
          {items.map((p, i) => {
            const d = i - pos
            const abs = Math.abs(d)
            const est = propertyEstimate(p)
            const isCenter = i === current
            return (
              <div
                key={p.id}
                className="absolute left-1/2 top-1/2"
                style={{
                  width: cardW,
                  height: cardH,
                  marginLeft: -cardW / 2,
                  marginTop: -cardH / 2,
                  // поворот вокруг центра дуги и вынос на радиус R: получается вогнутая стена
                  transform: `rotateY(${-d * ANGLE}deg) translateZ(${-Math.round(R)}px)`,
                  opacity: abs > 3.2 ? 0 : 1 - abs * 0.1,
                  filter: `brightness(${clamp(1 - abs * 0.3, 0.3, 1)})`,
                  zIndex: 100 - Math.round(abs * 10),
                  pointerEvents: abs > 3.2 ? 'none' : 'auto',
                  transition: dragging ? 'none' : 'transform 0.6s cubic-bezier(0.22, 0.8, 0.3, 1), opacity 0.6s, filter 0.6s',
                }}
                aria-hidden={!isCenter}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => {
                    if (wasDragged.current) return
                    if (isCenter) navigate(`/catalog/${p.id}`)
                    else go(i)
                  }}
                  className="group relative block size-full overflow-hidden rounded-md bg-slate-100 text-left ring-1 ring-white/10"
                >
                  <img src={p.photo} alt="" loading="lazy" decoding="async" draggable={false} className="size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />
                  {est && (
                    <div className="absolute right-3 top-3">
                      <LabelBadge label={est.label} />
                    </div>
                  )}
                  <div className="absolute inset-x-4 bottom-4 text-white">
                    <p className="text-2xl font-bold leading-none">{format(p.priceUsd)}</p>
                    <p className="mt-2 text-sm text-white/85">
                      {t('card.rooms', { count: p.rooms })} · {p.areaM2} м² · {t('card.land', { count: p.landSotka })}
                    </p>
                    <p className="mt-0.5 text-xs text-white/60">{district(p.districtId)}</p>
                  </div>
                </button>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          aria-label={t('carousel.prev')}
          onClick={() => go(current - 1)}
          disabled={current === 0}
          className="absolute left-3 top-1/2 z-[200] grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-xl text-white backdrop-blur transition hover:bg-black/70 disabled:opacity-30"
        >
          ←
        </button>
        <button
          type="button"
          aria-label={t('carousel.next')}
          onClick={() => go(current + 1)}
          disabled={current === last}
          className="absolute right-3 top-1/2 z-[200] grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-xl text-white backdrop-blur transition hover:bg-black/70 disabled:opacity-30"
        >
          →
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 text-sm">
        <p className="text-slate-600" aria-live="polite">
          {String(current + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
        </p>
        <Link to={`/catalog/${item.id}`} className="font-medium text-white hover:underline">
          {t('ticket.open')} →
        </Link>
      </div>
    </div>
  )
}
