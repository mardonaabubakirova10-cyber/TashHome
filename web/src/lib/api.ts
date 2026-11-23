import type { Property } from '../data/properties'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

/** Ошибка API: статус и сообщения по полям, если сервер их вернул. */
export class ApiError extends Error {
  status: number
  fields: Record<string, string>

  constructor(status: number, fields: Record<string, string> = {}) {
    super(`API ${status}`)
    this.status = status
    this.fields = fields
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { headers: { 'content-type': 'application/json' }, ...init })
  } catch {
    throw new ApiError(0) // сервер недоступен
  }
  if (!res.ok) {
    let fields: Record<string, string> = {}
    try {
      const body = (await res.json()) as { details?: Array<{ field: string; message: string }> }
      fields = Object.fromEntries((body.details ?? []).map((d) => [d.field, d.message]))
    } catch {
      /* тело ответа не JSON */
    }
    throw new ApiError(res.status, fields)
  }
  return res.json() as Promise<T>
}

export type Review = { id: number; author: string | null; rating: number; text: string; created_at: string }

export const getReviews = () => request<Review[]>('/reviews')

export const postReview = (body: { author?: string; rating: number; text: string }) =>
  request<{ id: number }>('/reviews', { method: 'POST', body: JSON.stringify(body) })

export const postLead = (body: { property_id?: number; name: string; phone: string; message?: string }) =>
  request<{ id: number }>('/leads', { method: 'POST', body: JSON.stringify({ ...body, source: 'site' }) })

export type PropertyPage = { items: Property[]; total: number; page: number; pageSize: number }

/** Параметры каталога для запроса: пустые значения отбрасываются. */
export const getProperties = (params: Record<string, string | number | undefined>) => {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
  return request<PropertyPage>(`/properties?${q}`)
}

export const getProperty = (id: number | string) => request<Property>(`/properties/${id}`)
