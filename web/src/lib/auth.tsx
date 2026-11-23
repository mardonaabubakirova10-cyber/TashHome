import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { API_URL } from './api'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''
const STORE_KEY = 'auth.v1'

type Session = { access_token: string; refresh_token: string; expires_at: number; email: string }
export type Role = 'client' | 'manager' | 'admin'

const read = (): Session | null => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') as Session | null
  } catch {
    return null
  }
}
const write = (s: Session | null) => {
  try {
    if (s) localStorage.setItem(STORE_KEY, JSON.stringify(s))
    else localStorage.removeItem(STORE_KEY)
  } catch {
    /* хранилище недоступно: сессия живёт до перезагрузки */
  }
}

async function gotrue(grant: 'password' | 'refresh_token', body: Record<string, string>): Promise<Session> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('not_configured')
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=${grant}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: SUPABASE_KEY },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(res.status === 400 ? 'bad_credentials' : 'failed')
  const d = (await res.json()) as { access_token: string; refresh_token: string; expires_at?: number; expires_in: number; user?: { email?: string } }
  return {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_at: d.expires_at ?? Math.floor(Date.now() / 1000) + d.expires_in,
    email: d.user?.email ?? '',
  }
}

type Ctx = {
  email: string | null
  loggedIn: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  /** Запрос к служебному API с токеном; при просроченном токене обновляет его, при отказе выходит из аккаунта. */
  api: <T>(path: string, init?: RequestInit) => Promise<T>
}

const AuthContext = createContext<Ctx | null>(null)

export class AdminApiError extends Error {
  status: number
  constructor(status: number) {
    super(`admin ${status}`)
    this.status = status
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(read)

  const save = useCallback((s: Session | null) => {
    write(s)
    setSession(s)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      save(await gotrue('password', { email, password }))
    },
    [save],
  )
  const logout = useCallback(() => save(null), [save])

  const api = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      let s = read()
      if (!s) throw new AdminApiError(401)
      if (s.expires_at - 30 < Date.now() / 1000) {
        try {
          s = await gotrue('refresh_token', { refresh_token: s.refresh_token })
          save(s)
        } catch {
          save(null)
          throw new AdminApiError(401)
        }
      }
      const res = await fetch(`${API_URL}${path}`, { ...init, headers: { 'content-type': 'application/json', ...init.headers, Authorization: `Bearer ${s.access_token}` } })
      if (res.status === 401) save(null)
      if (!res.ok) throw new AdminApiError(res.status)
      return res.json() as Promise<T>
    },
    [save],
  )

  const value = useMemo<Ctx>(() => ({ email: session?.email ?? null, loggedIn: Boolean(session), login, logout, api }), [session, login, logout, api])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth вне AuthProvider')
  return ctx
}
