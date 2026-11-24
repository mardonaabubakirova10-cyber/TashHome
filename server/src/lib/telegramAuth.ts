import { createHmac, timingSafeEqual } from 'node:crypto'

export type TelegramUser = { id: number; first_name: string; last_name?: string; username?: string; language_code?: string }
export type VerifiedInitData = { user: TelegramUser; authDate: number }

/**
 * Проверка подписи Mini App (initData) по правилам Telegram:
 * secret = HMAC_SHA256("WebAppData", токен бота), подпись = HMAC_SHA256(secret, строка из отсортированных полей без hash).
 * Данные старше maxAgeSec считаются просроченными. Возвращает пользователя или null, если подпись неверна.
 */
export function verifyInitData(initData: string, botToken: string, now = Date.now(), maxAgeSec = 24 * 3600): VerifiedInitData | null {
  if (!initData || initData.length > 4096 || !botToken) return null
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return null
  params.delete('hash')
  const check = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const expected = createHmac('sha256', secret).update(check).digest()
  const given = Buffer.from(hash, 'hex')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

  const authDate = Number(params.get('auth_date'))
  if (!Number.isFinite(authDate) || authDate <= 0) return null
  const age = now / 1000 - authDate
  if (age > maxAgeSec || age < -60) return null // просрочено или время из будущего

  try {
    const user = JSON.parse(params.get('user') ?? '') as TelegramUser
    if (typeof user.id !== 'number' || typeof user.first_name !== 'string') return null
    return { user, authDate }
  } catch {
    return null
  }
}
