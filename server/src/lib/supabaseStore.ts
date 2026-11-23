import type { Lead, Review, Store } from './store.js'

/** Хранилище на Supabase через REST (PostgREST). Работает с ключом сервера, который обходит RLS. */
export function createSupabaseStore(url: string, serviceKey: string): Store {
  const base = `${url.replace(/\/$/, '')}/rest/v1`
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'content-type': 'application/json',
    'user-agent': 'tashhome-server/1.0', // секретный ключ не принимается от «браузерных» запросов
  }

  async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${base}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } })
    if (!res.ok) throw new Error(`Supabase ${res.status} ${path.split('?')[0]}`)
    return res.json() as Promise<T>
  }

  const insert = async <T>(table: string, row: object): Promise<T> => {
    const rows = await call<T[]>(`/${table}`, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(row) })
    return rows[0]
  }

  return {
    addLead: (input) => insert<Lead>('leads', input),
    listLeads: () => call<Lead[]>('/leads?select=*&order=created_at.desc'),
    addReview: (input) => insert<Review>('reviews', input),
    listReviews: (limit) => call<Review[]>(`/reviews?select=id,author,rating,text,sentiment,topic,created_at&order=created_at.desc&limit=${limit}`),
  }
}
