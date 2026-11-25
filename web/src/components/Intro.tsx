import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import TashkentScene from './TashkentScene'

const SEEN = 'intro-seen'

/** Вступление показывается один раз за посещение, только если сайт открыт с главной и анимации не отключены. */
function shouldShow(): boolean {
  try {
    if (location.pathname !== '/' || sessionStorage.getItem(SEEN)) return false
    return !matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export default function Intro() {
  const [visible, setVisible] = useState(shouldShow)
  return visible ? <IntroScreen onDone={setVisible} /> : null
}

function IntroScreen({ onDone }: { onDone: (visible: boolean) => void }) {
  const { t } = useTranslation()
  const close = useCallback(() => {
    try {
      sessionStorage.setItem(SEEN, '1')
    } catch {
      /* без хранилища вступление просто покажется ещё раз после перезагрузки */
    }
    onDone(false)
  }, [onDone])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    const overflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = overflow
    }
  }, [close])

  // страховка на случай, если не придёт событие конца анимации: экран не должен остаться закрытым
  useEffect(() => {
    const id = window.setTimeout(close, 9000)
    return () => window.clearTimeout(id)
  }, [close])

  return (
    <div
      className="intro intro-play"
      role="dialog"
      aria-modal="true"
      aria-label="TashHome"
      onAnimationEnd={(e) => e.animationName === 'intro-exit' && close()}
    >
      <TashkentScene className="intro-scene" />
      <p className="intro-logo font-display text-2xl font-semibold tracking-tight">TashHome</p>

      <div className="intro-words">
        {([1, 2, 3] as const).map((n) => (
          <span key={n} style={{ animationDelay: `${2.5 + n * 0.3}s` }}>
            {t(`intro.word${n}`)}
          </span>
        ))}
      </div>

      <button type="button" autoFocus onClick={close} className="intro-skip">
        {t('intro.skip')}
      </button>
    </div>
  )
}
