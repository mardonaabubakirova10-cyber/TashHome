import { API_URL } from './api'

/** Часть интерфейса Telegram WebApp, которую использует сайт. */
export type TgWebApp = {
  initData: string
  initDataUnsafe: { user?: { id: number; first_name: string; last_name?: string; username?: string; language_code?: string } }
  colorScheme: 'light' | 'dark'
  ready(): void
  expand(): void
  setHeaderColor(c: string): void
  setBackgroundColor(c: string): void
  BackButton: { show(): void; hide(): void; onClick(f: () => void): void; offClick(f: () => void): void }
  MainButton: { setText(t: string): void; show(): void; hide(): void; onClick(f: () => void): void; offClick(f: () => void): void }
  HapticFeedback?: { notificationOccurred(t: 'success' | 'error' | 'warning'): void }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp }
  }
}

const SCRIPT = 'https://telegram.org/js/telegram-web-app.js'

/** Telegram передаёт данные в адресе (#tgWebAppData=…). Только тогда подключаем его скрипт: обычные посетители ничего лишнего не загружают. */
const insideTelegram = () => typeof location !== 'undefined' && /tgWebApp(Data|Version|Platform)=/.test(location.hash + location.search)

/** Возвращает объект WebApp, если сайт открыт внутри Telegram, иначе null. */
export function tg(): TgWebApp | null {
  const w = window.Telegram?.WebApp
  return w && w.initData ? w : null
}

export function isMiniApp(): boolean {
  return tg() !== null
}

/** Подключает скрипт Telegram и настраивает окно. Не ждёт дольше двух секунд; вне Telegram ничего не делает. */
export async function initMiniApp(): Promise<void> {
  if (!insideTelegram()) return
  await new Promise<void>((resolve) => {
    if (window.Telegram?.WebApp) return resolve()
    const s = document.createElement('script')
    s.src = SCRIPT
    s.onload = () => resolve()
    s.onerror = () => resolve()
    document.head.appendChild(s)
    setTimeout(resolve, 2000)
  })
  const w = tg()
  if (!w) return
  w.ready()
  w.expand()
  try {
    w.setHeaderColor('#000000')
    w.setBackgroundColor('#000000')
  } catch {
    /* старые версии клиента */
  }
  document.documentElement.classList.add('tg-mini-app')
}

export type MiniAppUser = { id: number; first_name: string; last_name: string | null; username: string | null; lang: 'ru' | 'uz' }

/** Проверка входа на сервере: подпись initData сверяется с токеном бота. Возвращает пользователя или null. */
export async function verifyTelegramUser(): Promise<MiniAppUser | null> {
  const w = tg()
  if (!w) return null
  try {
    const res = await fetch(`${API_URL}/telegram/auth`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ init_data: w.initData }) })
    if (!res.ok) return null
    return ((await res.json()) as { user: MiniAppUser }).user
  } catch {
    return null
  }
}
