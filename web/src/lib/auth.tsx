import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { API_URL } from './api'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''
const STORE_KEY = 'auth.v1'

type Session = { access_token: string; refresh_token: string; expires_at: number; email: string; name?: string; avatar?: string }
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
  name: string | null
  avatar: string | null
  loggedIn: boolean
  login: (email: string, password: string) => Promise<void>
  /** Переход на вход через Google (Supabase Auth) */
  loginWithGoogle: () => void
  /** Завершает вход через Google: разбирает адрес возврата и сохраняет сессию. false, если вход не удался. */
  completeOAuth: (hash: string) => Promise<boolean>
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

  const loginWithGoogle = useCallback(() => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return
    const back = encodeURIComponent(`${window.location.origin}/auth/callback`)
    window.location.assign(`${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${back}`)
  }, [])

  const completeOAuth = useCallback(
    async (hash: string) => {
      const p = new URLSearchParams(hash.replace(/^#/, ''))
      const access = p.get('access_token')
      const refresh = p.get('refresh_token')
      if (!access || !refresh || !SUPABASE_URL) return false
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${access}` } })
        if (!res.ok) return false
        const u = (await res.json()) as { email?: string; user_metadata?: { full_name?: string; name?: string; avatar_url?: string; picture?: string } }
        const expiresIn = Number(p.get('expires_in') ?? 3600)
        save({
          access_token: access,
          refresh_token: refresh,
          expires_at: Number(p.get('expires_at')) || Math.floor(Date.now() / 1000) + expiresIn,
          email: u.email ?? '',
          name: u.user_metadata?.full_name ?? u.user_metadata?.name,
          avatar: u.user_metadata?.avatar_url ?? u.user_metadata?.picture,
        })
        return true
      } catch {
        return false
      }
    },
    [save],
  )

  const api = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      let s = read()
      if (!s) throw new AdminApiError(401)
      if (s.expires_at - 30 < Date.now() / 1000) {
        try {
          s = { ...(await gotrue('refresh_token', { refresh_token: s.refresh_token })), name: s.name, avatar: s.avatar } // имя и фото из Google сохраняем
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

  const value = useMemo<Ctx>(
    () => ({ email: session?.email ?? null, name: session?.name ?? null, avatar: session?.avatar ?? null, loggedIn: Boolean(session), login, loginWithGoogle, completeOAuth, logout, api }),
    [session, login, loginWithGoogle, completeOAuth, logout, api],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth вне AuthProvider')
  return ctx
}
