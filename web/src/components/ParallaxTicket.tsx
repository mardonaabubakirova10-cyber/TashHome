import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { clamp, reduceMotion, register, spring, step, TICKET, type Spring } from '../lib/motion'

type Props = {
  /** Фото на лицевой стороне (двигается медленнее текста) */
  image: string
  /** Подпись для скринридера: что это и что делает нажатие */
  label: string
  /** Слой с текстом поверх фото (двигается сильнее, чем фото) */
  front: ReactNode
  /** Оборотная сторона; получает функцию переворота обратно */
  back: (flip: () => void) => ReactNode
  /** Кнопки поверх карточки (избранное и т.п.): не наклоняются и не переворачиваются вместе с ней */
  actions?: ReactNode
}

/**
 * Карточка с параллаксом: наклоняется к курсору, слои сдвигаются на разную глубину,
 * блик следует за курсором, по клику переворачивается на пружине. Без курсора слегка «плавает».
 */
export default function ParallaxTicket({ image, label, front, back, actions }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const ticketRef = useRef<HTMLDivElement>(null)
  const glareRef = useRef<HTMLDivElement>(null)
  const frontRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<HTMLDivElement>(null)
  const sim = useRef<{ F: Spring; LIFT: Spring } | null>(null)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    const stage = stageRef.current
    const ticket = ticketRef.current
    const glare = glareRef.current
    const frontSide = frontRef.current
    const backSide = backRef.current
    if (!stage || !ticket || !glare || !frontSide || !backSide) return

    const layers = [...ticket.querySelectorAll<HTMLElement>('[data-depth]')].map((el) => ({
      el,
      depth: Number(el.dataset.depth),
    }))

    const RX = spring(0, [220, 18])
    const RY = spring(0, [220, 18])
    const F = spring(0, TICKET.flip)
    const G = spring(0, TICKET.glare)
    const LIFT = spring(1, TICKET.lift)
    sim.current = { F, LIFT }

    let hover = false
    let nx = 0
    let ny = 0
    let gx = 50
    let gy = 30
    let clock = 0

    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect()
      nx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1)
      ny = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1)
      gx = (nx + 1) * 50
      gy = (ny + 1) * 50
      hover = true
    }
    const onLeave = () => {
      hover = false
    }
    const onDown = () => {
      LIFT.t = 0.97
    }
    const onUp = () => {
      LIFT.t = 1
    }
    stage.addEventListener('pointermove', onMove)
    stage.addEventListener('pointerleave', onLeave)
    stage.addEventListener('pointercancel', onLeave)
    stage.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)

    const loop = {
      frame(dt: number) {
        clock += dt
        if (hover) {
          RX.t = -ny * TICKET.tilt
          RY.t = nx * TICKET.tilt
          G.t = 1
        } else {
          // без курсора карточка слегка плавает, чтобы глубина была видна
          RX.t = reduceMotion ? 0 : Math.sin(clock * 0.9) * 4
          RY.t = reduceMotion ? 0 : Math.cos(clock * 0.7) * 7
          G.t = 0.25
        }
        ;[RX, RY, F, G, LIFT].forEach((s) => step(s, dt))
      },
      render() {
        ticket.style.transform = `rotateX(${RX.x}deg) rotateY(${RY.x + F.x}deg) scale(${LIFT.x})`
        // Safari на iPhone не всегда прячет изнанку по backface-visibility и показывает лицо зеркально,
        // поэтому после середины переворота нужную сторону включаем сами
        const turned = F.x > 90
        frontSide.style.visibility = turned ? 'hidden' : ''
        backSide.style.visibility = turned ? '' : 'hidden'
        // параллакс: слои сдвигаются против наклона, каждый на свою глубину
        const ox = RY.x / TICKET.tilt
        const oy = -RX.x / TICKET.tilt
        layers.forEach((l) => {
          l.el.style.transform = `translate(${ox * TICKET.depth * l.depth}px,${oy * TICKET.depth * l.depth}px)`
        })
        glare.style.setProperty('--g', String(clamp(G.x, 0, 1)))
        glare.style.setProperty('--gx', (hover ? gx : 50 + ox * 30) + '%')
        glare.style.setProperty('--gy', (hover ? gy : 30 + oy * 30) + '%')
      },
    }

    // Анимируем только то, что на экране: в каталоге карточек много
    let stop: (() => void) | null = null
    const start = () => {
      if (!stop) stop = register(loop)
    }
    const halt = () => {
      stop?.()
      stop = null
    }
    let observer: IntersectionObserver | null = null
    if (typeof IntersectionObserver === 'undefined') start()
    else {
      observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : halt()))
      observer.observe(stage)
    }

    return () => {
      halt()
      observer?.disconnect()
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerleave', onLeave)
      stage.removeEventListener('pointercancel', onLeave)
      stage.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      sim.current = null
    }
  }, [])

  // переворот: пружина идёт к 0° или 180°, плюс небольшой толчок
  useEffect(() => {
    const s = sim.current
    if (!s) return
    const target = flipped ? 180 : 0
    if (s.F.t === target) return
    s.F.t = target
    s.LIFT.v += 1.5
  }, [flipped])

  const flip = () => setFlipped((f) => !f)

  const onFrontKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      flip()
    }
  }
  // клик по пустому месту оборота переворачивает назад, ссылки и кнопки работают сами по себе
  const onBackClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('a,button')) return
    flip()
  }

  return (
    <div ref={stageRef} className="ticket-stage">
      <div ref={ticketRef} className="ticket">
        <div
          ref={frontRef}
          className="ticket-side cursor-pointer outline-offset-2 focus-visible:outline-2 focus-visible:outline-white"
          role="button"
          tabIndex={0}
          aria-pressed={flipped}
          aria-label={label}
          inert={flipped}
          onClick={flip}
          onKeyDown={onFrontKey}
        >
          <div className="ticket-layer -inset-3" data-depth=".25">
            <img src={image} alt="" loading="lazy" draggable={false} className="size-full object-cover sepia-[.25]" />
          </div>
          <div className="ticket-shade" />
          <div className="ticket-layer inset-0" data-depth=".9">
            {front}
          </div>
          <div ref={glareRef} className="ticket-glare" />
        </div>

        <div ref={backRef} className="ticket-side ticket-back" inert={!flipped} onClick={onBackClick}>
          {back(flip)}
        </div>
      </div>
      {actions && <div className="absolute right-3 top-3 z-10">{actions}</div>}
    </div>
  )
}
