import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ChatPanel from './ChatPanel'

/** Плавающая кнопка и окно ассистента на всех страницах, кроме отдельной страницы ассистента. */
export default function ChatWidget() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (pathname.startsWith('/assistant')) return null

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label={t('chat.title')}
          className="fixed inset-x-3 bottom-20 z-50 flex h-[min(38rem,calc(100svh-6.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-2xl shadow-black/60 sm:inset-x-auto sm:right-5 sm:w-[26rem]"
        >
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">{t('chat.title')}</h2>
              <p className="text-xs text-slate-500">{t('chat.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('chat.close')}
              className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-white"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>
          <div className="min-h-0 flex-1">
            <ChatPanel autoFocus onNavigate={() => setOpen(false)} />
          </div>
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t('chat.close') : t('chat.open')}
        aria-expanded={open}
        className="fixed bottom-5 right-4 z-50 flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-black shadow-xl shadow-black/50 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-5"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
        </svg>
        <span className="hidden sm:inline">{t('chat.open')}</span>
      </button>
    </>
  )
}
