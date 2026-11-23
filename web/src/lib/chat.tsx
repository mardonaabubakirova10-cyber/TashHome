import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Property } from '../data/properties'
import { API_URL } from './api'

export type ChatMsg = {
  id: number
  role: 'user' | 'assistant'
  text: string
  properties?: Property[]
  /** Название инструмента, который ассистент выполняет прямо сейчас */
  status?: string
  error?: boolean
  leadCreated?: boolean
}

type ServerEvent =
  | { event: 'session'; data: { id: string } }
  | { event: 'status'; data: { tool: string } }
  | { event: 'token'; data: { text: string } }
  | { event: 'properties'; data: { items: Property[] } }
  | { event: 'done'; data: { lead_created: boolean } }
  | { event: 'error'; data: { code: string } }

/** Читает поток SSE от /api/chat и вызывает onEvent на каждое событие. Бросает ошибку, если сервер ответил не потоком. */
export async function streamChat(
  body: { message: string; lang: 'ru' | 'uz'; session_id?: string },
  onEvent: (e: ServerEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal })
  if (!res.ok || !res.body) throw new Error(`chat ${res.status}`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let sep: number
    while ((sep = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, sep)
      buf = buf.slice(sep + 2)
      const event = /^event: (.+)$/m.exec(block)?.[1]
      const data = /^data: (.+)$/m.exec(block)?.[1]
      if (event && data) {
        try {
          onEvent({ event, data: JSON.parse(data) } as ServerEvent)
        } catch {
          /* битый блок пропускаем */
        }
      }
    }
  }
}

const STORE_KEY = 'chat.v1'
type Saved = { sessionId?: string; messages: ChatMsg[] }

const load = (): Saved => {
  try {
    const s = JSON.parse(sessionStorage.getItem(STORE_KEY) ?? 'null') as Saved | null
    if (s && Array.isArray(s.messages)) return { sessionId: s.sessionId, messages: s.messages.filter((m) => !m.status) }
  } catch {
    /* хранилище недоступно */
  }
  return { messages: [] }
}

type Ctx = {
  messages: ChatMsg[]
  sending: boolean
  send: (text: string) => void
  reset: () => void
}

const ChatContext = createContext<Ctx | null>(null)

/** Одно состояние диалога на весь сайт: виджет и страница ассистента показывают один и тот же разговор. */
export function ChatProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  const [state, setState] = useState<Saved>(load)
  const [sending, setSending] = useState(false)
  const abort = useRef<AbortController | null>(null)
  const nextId = useRef(state.messages.reduce((m, x) => Math.max(m, x.id), 0) + 1)
  const sessionRef = useRef(state.sessionId)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ sessionId: sessionRef.current, messages: state.messages }))
    } catch {
      /* ничего страшного */
    }
  }, [state])

  const patchLast = useCallback((fn: (m: ChatMsg) => ChatMsg) => {
    setState((s) => ({ ...s, messages: s.messages.map((m, i) => (i === s.messages.length - 1 ? fn(m) : m)) }))
  }, [])

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text || sending) return
      const lang = i18n.language === 'uz' ? 'uz' : 'ru'
      const ctrl = new AbortController()
      abort.current = ctrl
      setSending(true)
      setState((s) => ({
        ...s,
        messages: [...s.messages, { id: nextId.current++, role: 'user', text }, { id: nextId.current++, role: 'assistant', text: '', status: 'thinking' }],
      }))

      streamChat(
        { message: text, lang, session_id: sessionRef.current },
        (e) => {
          if (e.event === 'session') {
            sessionRef.current = e.data.id
          } else if (e.event === 'status') {
            patchLast((m) => ({ ...m, status: e.data.tool }))
          } else if (e.event === 'token') {
            patchLast((m) => ({ ...m, text: m.text + e.data.text, status: undefined }))
          } else if (e.event === 'properties') {
            patchLast((m) => ({ ...m, properties: e.data.items }))
          } else if (e.event === 'done') {
            patchLast((m) => ({ ...m, status: undefined, leadCreated: e.data.lead_created }))
          } else if (e.event === 'error') {
            patchLast((m) => ({ ...m, status: undefined, error: true }))
          }
        },
        ctrl.signal,
      )
        .catch((err) => {
          if (ctrl.signal.aborted) return
          console.error('chat', err instanceof Error ? err.message : err)
          patchLast((m) => ({ ...m, status: undefined, error: true }))
        })
        .finally(() => {
          if (abort.current === ctrl) setSending(false)
          patchLast((m) => (m.status ? { ...m, status: undefined } : m))
        })
    },
    [i18n.language, patchLast, sending],
  )

  const reset = useCallback(() => {
    abort.current?.abort()
    sessionRef.current = undefined
    setSending(false)
    setState({ messages: [] })
  }, [])

  return <ChatContext.Provider value={{ messages: state.messages, sending, send, reset }}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat вне ChatProvider')
  return ctx
}
