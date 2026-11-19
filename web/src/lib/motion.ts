// Мини-движок пружин для карточки Parallax Ticket (Motion Studies).
// Значения жёсткости и затухания взяты из tokens.css, чтобы карточка двигалась так же.

export type Spring = { x: number; v: number; t: number; k: number; c: number }

export const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Пружина: x — текущее значение, t — цель, k — жёсткость, c — затухание. */
export const spring = (x: number, [k, c]: readonly [number, number]): Spring => ({
  x,
  v: 0,
  t: x,
  k,
  // при «уменьшить движение» пружина без отскока
  c: reduceMotion ? 2 * Math.sqrt(k) : c,
})

export const step = (s: Spring, dt: number) => {
  const a = -s.k * (s.x - s.t) - s.c * s.v
  s.v += a * dt
  s.x += s.v * dt
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/** Токены Parallax Ticket из tokens.css: наклон (град), сдвиг слоя (px), пружины «жёсткость затухание». */
export const TICKET = {
  tilt: 14,
  depth: 12,
  flip: [170, 15],
  follow: [220, 18],
  glare: [300, 26],
  lift: [300, 18],
} as const

// Один общий цикл анимации на все карточки; 4 подшага на кадр, как в оригинале.
type Item = { frame: (dt: number) => void; render: () => void }
const items = new Set<Item>()
let raf = 0
let last = 0

function tick(now: number) {
  const dt = Math.min((now - last) / 1000, 1 / 30)
  last = now
  const SUB = 4
  items.forEach((c) => {
    for (let k = 0; k < SUB; k++) c.frame(dt / SUB)
  })
  items.forEach((c) => c.render())
  raf = requestAnimationFrame(tick)
}

/** Подключает элемент к циклу анимации. Возвращает функцию отключения. */
export function register(item: Item): () => void {
  items.add(item)
  if (items.size === 1) {
    last = performance.now()
    raf = requestAnimationFrame(tick)
  }
  return () => {
    items.delete(item)
    if (items.size === 0) cancelAnimationFrame(raf)
  }
}
