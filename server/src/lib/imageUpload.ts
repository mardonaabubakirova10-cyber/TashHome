import { config } from '../config.js'

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const BUCKET = 'property-photos'

/** Тип по первым байтам файла: заявленному Content-Type не доверяем. */
export function sniffImage(buf: Buffer): { mime: 'image/jpeg' | 'image/png' | 'image/webp'; ext: 'jpg' | 'png' | 'webp' } | null {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' }
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return { mime: 'image/webp', ext: 'webp' }
  return null
}

let bucketReady = false

/** Загружает фото в публичный бакет Supabase Storage (создаёт бакет при первом обращении) и возвращает адрес https. */
export async function uploadToSupabase(data: Buffer, mime: string, ext: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const base = config.supabaseUrl.replace(/\/$/, '')
  const headers = { apikey: config.supabaseKey, Authorization: `Bearer ${config.supabaseKey}`, 'user-agent': 'tashhome-server/1.0' }
  if (!bucketReady) {
    const r = await fetchImpl(`${base}/storage/v1/bucket`, {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: MAX_IMAGE_BYTES, allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'] }),
    })
    if (!r.ok && r.status !== 409 && r.status !== 400) throw new Error(`storage bucket ${r.status}`) // 400/409: бакет уже существует
    bucketReady = true
  }
  const name = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${ext}`
  const up = await fetchImpl(`${base}/storage/v1/object/${BUCKET}/${name}`, { method: 'POST', headers: { ...headers, 'content-type': mime }, body: new Uint8Array(data) })
  if (!up.ok) throw new Error(`storage upload ${up.status}`)
  return `${base}/storage/v1/object/public/${BUCKET}/${name}`
}
