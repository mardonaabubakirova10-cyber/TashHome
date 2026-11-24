import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DISTRICTS } from '../../data/properties'
import { useAuth } from '../../lib/auth'
import PropertyForm, { type AdminProperty } from './PropertyForm'

type Page = { items: AdminProperty[]; total: number; page: number; pageSize: number }

const STATUS: Record<string, string> = { active: 'В продаже', sold: 'Продан', hidden: 'Скрыт' }
const LABEL: Record<string, string> = { below: 'ниже рынка', fair: 'по рынку', above: 'выше рынка' }
const PAGE_SIZE = 20

export default function AdminProperties() {
  const { api } = useAuth()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<AdminProperty | 'new' | null>(null)

  const list = useQuery({
    queryKey: ['admin-properties', q, status, page],
    queryFn: () => api<Page>(`/admin/properties?page=${page}&pageSize=${PAGE_SIZE}${status ? `&status=${status}` : ''}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''}`),
  })
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / PAGE_SIZE))
  const district = (id: string) => DISTRICTS.find((d) => d.id === id)?.ru ?? id
  const field = 'rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900'

  if (editing) return <PropertyForm initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Дома</h1>
          <p className="text-sm text-slate-500">{list.data ? `Всего: ${list.data.total}` : ' '}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm text-slate-600">
            Поиск
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder="Название, адрес или номер"
              className={`${field} w-56`}
            />
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            Статус
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              className={field}
            >
              <option value="">Все</option>
              {Object.entries(STATUS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => setEditing('new')} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black">
            Добавить дом
          </button>
        </div>
      </div>

      {list.isError && <p className="text-red-400">Не удалось загрузить дома.</p>}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">№</th>
              <th className="px-4 py-3">Дом</th>
              <th className="px-4 py-3">Район</th>
              <th className="px-4 py-3">Цена</th>
              <th className="px-4 py-3">Оценка модели</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {list.data?.items.map((p) => (
              <tr key={p.id} className="align-middle">
                <td className="px-4 py-2 text-slate-500">{p.id}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    {p.photos[0] ? <img src={p.photos[0]} alt="" className="h-10 w-14 rounded object-cover" /> : <span className="h-10 w-14 rounded bg-slate-200" />}
                    <span className="font-medium">{p.title_ru}</span>
                  </div>
                </td>
                <td className="px-4 py-2">{district(p.district_id)}</td>
                <td className="whitespace-nowrap px-4 py-2">
                  ${p.price_usd.toLocaleString('ru-RU')}
                  {p.deal_type === 'rent' && <span className="text-slate-500"> /мес</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-slate-600">
                  {p.predicted_price_usd ? `$${p.predicted_price_usd.toLocaleString('ru-RU')} · ${p.price_label ? LABEL[p.price_label] : ''}` : '—'}
                </td>
                <td className="px-4 py-2">{STATUS[p.status]}</td>
                <td className="whitespace-nowrap px-4 py-2 text-right">
                  <Link to={`/catalog/${p.id}`} target="_blank" className="mr-3 text-slate-500 hover:text-slate-900 hover:underline">
                    На сайте
                  </Link>
                  <button type="button" onClick={() => setEditing(p)} className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-200">
                    Изменить
                  </button>
                </td>
              </tr>
            ))}
            {list.data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  Ничего не найдено.
                </td>
              </tr>
            )}
            {list.isPending && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  Загрузка…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">
            Назад
          </button>
          <span className="text-slate-600">
            {page} / {pages}
          </span>
          <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-40">
            Вперёд
          </button>
        </div>
      )}
    </section>
  )
}
