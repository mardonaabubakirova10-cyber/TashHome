import { useCallback, useEffect, useRef, useState } from 'react'
import { API_URL } from './api'

export const MAX_RECORD_SECONDS = 60

export type VoiceState = 'idle' | 'recording' | 'processing'
export type VoiceError = 'denied' | 'empty' | 'failed' | null

const pickMime = () => {
  if (typeof MediaRecorder === 'undefined') return ''
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
}

/** Расшифровка записи на сервере (Gemini). Возвращает текст, пустую строку если речи не слышно. */
async function transcribe(blob: Blob): Promise<string> {
  const res = await fetch(`${API_URL}/transcribe`, { method: 'POST', headers: { 'content-type': blob.type.split(';')[0] || 'audio/webm' }, body: blob })
  if (!res.ok) throw new Error(`transcribe ${res.status}`)
  return ((await res.json()) as { text: string }).text.trim()
}

/**
 * Голосовой ввод: запись с микрофона до MAX_RECORD_SECONDS, затем расшифровка на сервере.
 * Результат отдаётся в onText, а не отправляется сам: человек проверяет текст и жмёт «Отправить».
 */
export function useVoiceInput(onText: (text: string) => void) {
  const supported = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
  const [state, setState] = useState<VoiceState>('idle')
  const [error, setError] = useState<VoiceError>(null)
  const [seconds, setSeconds] = useState(0)
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const timer = useRef<number | null>(null)
  const cancelled = useRef(false)

  const cleanup = useCallback(() => {
    if (timer.current) window.clearInterval(timer.current)
    timer.current = null
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }, [])

  const stop = useCallback(() => {
    if (recorder.current?.state === 'recording') recorder.current.stop()
  }, [])

  const start = useCallback(async () => {
    if (!supported || state !== 'idle') return
    setError(null)
    cancelled.current = false
    let media: MediaStream
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
    } catch {
      setError('denied')
      return
    }
    stream.current = media
    const mime = pickMime()
    const rec = new MediaRecorder(media, mime ? { mimeType: mime } : undefined)
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = async () => {
      cleanup()
      if (cancelled.current) return setState('idle')
      const blob = new Blob(chunks, { type: rec.mimeType || mime || 'audio/webm' })
      if (blob.size < 1000) {
        setError('empty')
        return setState('idle')
      }
      setState('processing')
      try {
        const text = await transcribe(blob)
        if (cancelled.current) return
        if (text) onText(text)
        else setError('empty')
      } catch {
        if (!cancelled.current) setError('failed')
      } finally {
        setState('idle')
      }
    }
    recorder.current = rec
    rec.start()
    setSeconds(0)
    setState('recording')
    timer.current = window.setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_RECORD_SECONDS) stop()
        return s + 1
      })
    }, 1000)
  }, [cleanup, onText, state, stop, supported])

  const cancel = useCallback(() => {
    cancelled.current = true
    stop()
    cleanup()
    setState('idle')
  }, [cleanup, stop])

  useEffect(() => () => cancel(), [cancel])

  return { supported, state, error, seconds, start, stop, cancel }
}
