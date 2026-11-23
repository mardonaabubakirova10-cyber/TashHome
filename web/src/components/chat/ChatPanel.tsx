import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DISTRICTS, type Property } from '../../data/properties'
import { useChat, type ChatMsg } from '../../lib/chat'
import { useCurrency } from '../../lib/currency'
import { MAX_RECORD_SECONDS, useVoiceInput } from '../../lib/voice'
import PriceLabelBadge from '../PriceLabelBadge'
import Markdown from './Markdown'

function HouseCard({ item, onOpen }: { item: Property; onOpen?: () => void }) {
  const { t, i18n } = useTranslation()
  const { format } = useCurrency()
  const d = DISTRICTS.find((x) => x.id === item.districtId)
  const district = d ? (i18n.language === 'uz' ? d.uz : d.ru) : ''
  return (
    <Link
      to={`/catalog/${item.id}`}
      onClick={onOpen}
      className="flex w-56 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100 transition-colors hover:border-slate-400 focus-visible:outline-2 focus-visible:outline-white"
    >
      <img src={item.photo} alt="" loading="lazy" className="aspect-[16/10] w-full object-cover" />
      <div className="grid gap-1 p-3 text-sm">
        <p className="font-semibold text-slate-900">
          {format(item.priceUsd)}
          {item.dealType === 'rent' && <span className="text-xs font-normal text-slate-500"> {t('deal.perMonth')}</span>}
        </p>
        <p className="text-slate-700">{t('property.title', { rooms: item.rooms, district })}</p>
        <p className="text-xs text-slate-500">
          {item.areaM2} м² · {t('card.land', { count: item.landSotka })}
        </p>
        <div>
          <PriceLabelBadge item={item} />
        </div>
      </div>
    </Link>
  )
}

function Bubble({ m, onOpen }: { m: ChatMsg; onOpen?: () => void }) {
  const { t } = useTranslation()
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-white px-3.5 py-2 text-sm text-black">{m.text}</p>
      </div>
    )
  }
  return (
    <div className="grid gap-2">
      {(m.text || m.status || m.error) && (
        <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-slate-200 px-3.5 py-2.5 text-slate-900">
          {m.text && <Markdown text={m.text} />}
          {m.status && (
            <p className="flex items-center gap-2 text-xs text-slate-500" aria-live="polite">
              <span className="inline-flex gap-0.5" aria-hidden>
                <i className="size-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.2s]" />
                <i className="size-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:-0.1s]" />
                <i className="size-1.5 animate-bounce rounded-full bg-slate-500" />
              </span>
              {t(`chat.status.${m.status}`, { defaultValue: t('chat.status.thinking') })}
            </p>
          )}
          {m.error && <p className="text-sm text-red-500">{t('chat.error')}</p>}
        </div>
      )}
      {m.properties && m.properties.length > 0 && (
        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2" role="list" aria-label={t('chat.found')}>
          {m.properties.map((p) => (
            <div key={p.id} role="listitem">
              <HouseCard item={p} onOpen={onOpen} />
            </div>
          ))}
        </div>
      )}
      {m.leadCreated && <p className="text-xs text-emerald-400">✓ {t('chat.leadCreated')}</p>}
    </div>
  )
}

/** Окно диалога: лента сообщений, подсказки, поле ввода. Используется и в виджете, и на странице ассистента. */
export default function ChatPanel({ onNavigate, autoFocus }: { onNavigate?: () => void; autoFocus?: boolean }) {
  const { t } = useTranslation()
  const { messages, sending, send, reset } = useChat()
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!text.trim() || sending) return
    send(text)
    setText('')
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) submit(e)
  }
  const onVoiceText = useCallback((v: string) => {
    setText((prev) => (prev.trim() ? `${prev.trim()} ${v}` : v))
    inputRef.current?.focus()
  }, [])
  const voice = useVoiceInput(onVoiceText)
  const mmss = `${Math.floor(voice.seconds / 60)}:${String(voice.seconds % 60).padStart(2, '0')}`
  const suggestions = t('chat.suggestions', { returnObjects: true }) as string[]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="grid gap-4">
            <p className="text-sm text-slate-700">{t('chat.welcome')}</p>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(suggestions) &&
                suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:border-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-white"
                  >
                    {s}
                  </button>
                ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <Bubble key={m.id} m={m} onOpen={onNavigate} />)
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="border-t border-slate-200 p-3">
        {(voice.state !== 'idle' || voice.error) && (
          <p className={`mb-2 flex items-center gap-2 text-xs ${voice.error ? 'text-red-400' : 'text-slate-600'}`} role="status">
            {voice.state === 'recording' && (
              <>
                <span className="size-2 animate-pulse rounded-full bg-red-500" aria-hidden />
                {t('chat.voice.recording', { time: mmss, max: MAX_RECORD_SECONDS })}
              </>
            )}
            {voice.state === 'processing' && t('chat.voice.processing')}
            {voice.state === 'idle' && voice.error && t(`chat.voice.${voice.error}`)}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            maxLength={1000}
            placeholder={t('chat.placeholder')}
            aria-label={t('chat.placeholder')}
            className="max-h-28 min-h-[2.5rem] flex-1 resize-none rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-white"
          />
          {voice.supported && (
            <button
              type="button"
              onClick={() => (voice.state === 'recording' ? voice.stop() : voice.start())}
              disabled={voice.state === 'processing' || sending}
              aria-label={voice.state === 'recording' ? t('chat.voice.stop') : t('chat.voice.start')}
              aria-pressed={voice.state === 'recording'}
              title={voice.state === 'recording' ? t('chat.voice.stop') : t('chat.voice.start')}
              className={`grid size-10 shrink-0 place-items-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40 ${voice.state === 'recording' ? 'animate-pulse border-red-500 bg-red-500/20 text-red-400' : 'border-slate-300 text-slate-700 hover:border-slate-500 hover:text-slate-900'}`}
            >
              {voice.state === 'recording' ? (
                <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="9" y="3" width="6" height="12" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              )}
            </button>
          )}
          <button
            type="submit"
            disabled={sending || !text.trim()}
            aria-label={t('chat.send')}
            className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-black transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[0.7rem] text-slate-500">
          <span>{t('chat.disclaimer')}</span>
          {messages.length > 0 && (
            <button type="button" onClick={reset} className="whitespace-nowrap underline-offset-2 hover:text-slate-800 hover:underline">
              {t('chat.new')}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
