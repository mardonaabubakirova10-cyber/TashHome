import { useEffect, useRef, useState } from 'react'

/**
 * Тонкие линии, которые плавно продолжают зазоры между фото ковра на главной и уходят вдаль.
 * Рисуются обычным SVG (всегда сплошные и тонкие), а точки считаются по тем же формулам перспективы,
 * что у самого ковра. Если меняете perspective, наклон, bottom или gap ковра в Home.tsx, поменяйте и здесь.
 */
const PERSPECTIVE = 700
const TILT = (68 * Math.PI) / 180
const BOTTOM = 0.3 // низ ковра опущен на 30% высоты блока
const GAP = 4

type Props = {
  cols: number
  /** сколько рядов фото в ковре */
  rows: number
  /** ширина ковра в долях ширины блока */
  widthRatio: number
  /** подъём клетки по номеру колонки (px), как у фото */
  lift: (col: number) => number
}

export default function CarpetLines({ cols, rows, widthRatio, lift }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const el = host.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { w, h } = size
  const width = w * widthRatio
  const pitch = (width - GAP * (cols - 1)) / cols + GAP // шаг колонок и рядов

  /** Точка на экране: j — граница колонок (0…cols), k — ряд, считая от нижнего края ковра. */
  const point = (j: number, k: number): [number, number] => {
    const x = -width / 2 + j * pitch - GAP / 2
    const up = k * pitch - GAP / 2
    const z = lift(j - 0.5)
    const f = PERSPECTIVE / (PERSPECTIVE + up * Math.sin(TILT) - z * Math.cos(TILT))
    return [w / 2 + x * f, h / 2 + (h * (1 + BOTTOM) - up * Math.cos(TILT) - z * Math.sin(TILT) - h / 2) * f]
  }
  const at = (j: number, k: number) => point(j, k).map((v) => v.toFixed(1)).join(' ')

  const from = rows * 0.45 // начинаются среди фото, в зазорах между ними
  const to = rows * (w < 640 ? 2.2 : 3.2) // тянутся далеко к горизонту и растворяются раньше, чем кончаются
  // по бокам линии продолжаются далеко за край ковра: вдали он сужается, а линии должны заполнять всю ширину
  const extra = Math.round(cols * 1.3)
  const boundaries = Array.from({ length: cols + 1 + extra * 2 }, (_, i) => i - extra)
  const across = Array.from({ length: Math.ceil(to - rows) }, (_, i) => rows + i)
  const end = point(0, to * 0.85)[1] // здесь линии уже полностью прозрачны
  const start = point(0, rows * 0.6)[1]

  return (
    <div ref={host} className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%]" aria-hidden>
      {w > 0 && (
        <svg width={w} height={h} className="overflow-visible" fill="none" strokeWidth="0.6">
          <defs>
            {/* плавно растворяются вдали: видимого конца у линий нет */}
            <linearGradient id="carpet-fade" gradientUnits="userSpaceOnUse" x1="0" y1={end} x2="0" y2={start}>
              <stop offset="0" stopColor="#96a5dc" stopOpacity="0" />
              <stop offset="0.35" stopColor="#96a5dc" stopOpacity="0.2" />
              <stop offset="0.7" stopColor="#96a5dc" stopOpacity="0.45" />
              <stop offset="1" stopColor="#96a5dc" stopOpacity="0.65" />
            </linearGradient>
          </defs>
          <g stroke="url(#carpet-fade)">
            {boundaries.map((j) => (
              <path key={`v${j}`} d={`M${at(j, from)}L${at(j, to)}`} />
            ))}
            {across.map((k) => (
              <path key={`h${k}`} d={`M${boundaries.map((j) => at(j, k)).join('L')}`} />
            ))}
          </g>
        </svg>
      )}
    </div>
  )
}
