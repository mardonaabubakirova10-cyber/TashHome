import type { RequestHandler } from 'express'
import { HttpError } from './errors.js'

export type Role = 'client' | 'manager' | 'admin'
export type AuthUser = { id: string; email: string | null; role: Role }

/** Проверка токена входа. Возвращает пользователя с ролью или null, если токен недействителен. */
export interface Auth {
  verify(token: string): Promise<AuthUser | null>
}

/** Заглушка по умолчанию: никого не пускает (безопасно для запуска без базы и для тестов публичных маршрутов). */
export const denyAllAuth: Auth = { verify: async () => null }

/** Проверка через Supabase Auth: токен → пользователь → роль из таблицы profiles. */
export function createSupabaseAuth(url: string, serviceKey: string, fetchImpl: typeof fetch = fetch): Auth {
  const base = url.replace(/\/$/, '')
  const headers = { apikey: serviceKey, 'user-agent': 'tashhome-server/1.0' }
  return {
    async verify(token) {
      try {
        const u = await fetchImpl(`${base}/auth/v1/user`, { headers: { ...headers, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) })
        if (!u.ok) return null
        const user = (await u.json()) as { id?: string; email?: string }
        if (!user.id || !/^[0-9a-f-]{36}$/i.test(user.id)) return null
        const p = await fetchImpl(`${base}/rest/v1/profiles?select=role&id=eq.${user.id}`, { headers: { ...headers, Authorization: `Bearer ${serviceKey}` }, signal: AbortSignal.timeout(8000) })
        if (!p.ok) return null
        const rows = (await p.json()) as Array<{ role: Role }>
        return { id: user.id, email: user.email ?? null, role: rows[0]?.role ?? 'client' }
      } catch {
        return null
      }
    },
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser
  }
}

/** Пускает только указанные роли. 401 без токена, 403 если роль не подходит. */
export function requireRole(auth: Auth, ...roles: Role[]): RequestHandler {
  return async (req, _res, next) => {
    try {
      const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')
      if (!m) throw new HttpError(401, 'Нужно войти')
      const user = await auth.verify(m[1])
      if (!user) throw new HttpError(401, 'Сессия недействительна, войдите заново')
      if (!roles.includes(user.role)) throw new HttpError(403, 'Недостаточно прав')
      req.user = user
      next()
    } catch (e) {
      next(e)
    }
  }
}
