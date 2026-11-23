import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../lib/auth'
import { fmtDate } from './AdminLeads'

type Review = { id: number; author: string | null; rating: number; text: string; sentiment: string | null; topic: string | null; created_at: string }
type Page = { items: Review[]; total: number; page: number; pageSize: number }

const SENTIMENT: Record<string, { label: string; cls: string }> = {
  positive: { label: 'Положительный', cls: 'bg-emerald-500/15 text-emerald-400' },
  neutral: { label: 'Нейтральный', cls: 'bg-slate-300/20 text-slate-600' },
  negative: { label: 'Негативный', cls: 'bg-red-500/15 text-red-400' },
}
const TOPIC: Record<string, string> = { service: 'Обслуживание', price: 'Цена', property: 'Дом', manager: 'Менеджер', other: 'Другое' }
const PAGE_SIZE = 20

export default function AdminReviews() {
  const { api } = useAuth()
  const [sentiment, setSentiment] = useState('')
  const [topic, setTopic] = useState('')
  const [page, setPage] = useState(1)

  const q = useQuery({
    queryKey: ['admin-reviews', sentiment, topic, page],
    queryFn: () => api<Page>(`/admin/reviews?page=${page}&pageSize=${PAGE_SIZE}${sentiment ? `&sentiment=${sentiment}` : ''}${topic ? `&topic=${topic}` : ''}`),
  })
  const pages = Math.max(1, Math.ceil((q.data?.total ?? 0) / PAGE_SIZE))
  const select = 'rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900'

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Отзывы</h1>
          <p className="text-sm text-slate-500">{q.data ? `Всего: ${q.data.total}` : ' '}</p>
        </div>
        <div className="flex gap-3">
          <label className="grid gap-1 text-sm text-slate-600">
            Тональность
            <select
              value={sentiment}
              onChange={(e) => {
                setSentiment(e.target.value)
                setPage(1)
              }}
              className={select}
            >
              <option value="">Любая</option>
              {Object.entries(SENTIMENT).map(([v, s]) => (
                <option key={v} value={v}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-slate-600">
            Тема
            <select
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value)
                setPage(1)
              }}
              className={select}
            >
              <option value="">Любая</option>
              {Object.entries(TOPIC).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {q.isError && <p className="text-red-400">Не удалось загрузить отзывы.</p>}
      {q.isPending && <p className="text-slate-500">Загрузка…</p>}
      {q.data?.items.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-slate-500">Отзывов по этим условиям нет.</p>}

      <ul className="grid gap-3">
        {q.data?.items.map((r) => {
          const s = r.sentiment ? SENTIMENT[r.sentiment] : null
          return (
            <li key={r.id} className="rounded-xl border border-slate-200 bg-slate-100 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-base tracking-wider text-white" aria-label={`Оценка ${r.rating} из 5`}>
                  {'★'.repeat(r.rating)}
                  <span className="text-slate-400">{'★'.repeat(5 - r.rating)}</span>
                </span>
                <span className="font-medium">{r.author || 'Аноним'}</span>
                <span className="text-slate-500">{fmtDate(r.created_at)}</span>
                <span className="ml-auto flex gap-2">
                  {s ? <span className={`rounded-full px-2.5 py-0.5 text-xs ${s.cls}`}>{s.label}</span> : <span className="text-xs text-slate-500">не размечен</span>}
                  {r.topic && <span className="rounded-full bg-slate-300/20 px-2.5 py-0.5 text-xs text-slate-700">{TOPIC[r.topic]}</span>}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{r.text}</p>
            </li>
          )
        })}
      </ul>

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
