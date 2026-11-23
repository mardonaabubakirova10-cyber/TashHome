/** Минимальный REST-клиент Supabase для служебных скриптов (индексация, пересчёты). Ключ сервера, обходит RLS. */
export function createRest(url: string, key: string) {
  const base = `${url.replace(/\/$/, '')}/rest/v1`
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'content-type': 'application/json', 'user-agent': 'tashhome-script/1.0' }
  async function req<T>(method: string, path: string, body?: unknown, prefer?: string): Promise<T> {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: prefer ? { ...headers, Prefer: prefer } : headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Supabase ${res.status} ${method} ${path.split('?')[0]}: ${(await res.text()).slice(0, 300)}`)
    const text = await res.text()
    return (text ? JSON.parse(text) : null) as T
  }
  return {
    get: <T>(path: string) => req<T>('GET', path),
    insert: <T>(table: string, rows: unknown) => req<T[]>('POST', `/${table}`, rows, 'return=representation'),
    patch: (path: string, data: unknown) => req<null>('PATCH', path, data),
    remove: (path: string) => req<null>('DELETE', path),
    rpc: <T>(fn: string, args: unknown) => req<T>('POST', `/rpc/${fn}`, args),
  }
}

/** Вектор в текстовом виде, который принимает pgvector. */
export const vectorLiteral = (v: number[]) => `[${v.join(',')}]`
