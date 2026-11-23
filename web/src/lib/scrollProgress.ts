const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Прогресс прокрутки блока от 0 до 1: 0, когда центр блока только появляется внизу экрана,
 * и 1, когда центр поднялся примерно к середине экрана.
 */
export function scrollProgress(el: Element): number {
  const r = el.getBoundingClientRect()
  const vh = window.innerHeight
  const center = r.top + r.height / 2
  return clamp((vh * 0.95 - center) / (vh * 0.5), 0, 1)
}

/** Номер стадии (0, 1 или 2) по прогрессу: контур, окна, готовый дом. */
export function stageOf(progress: number): 0 | 1 | 2 {
  return progress < 0.38 ? 0 : progress < 0.72 ? 1 : 2
}
