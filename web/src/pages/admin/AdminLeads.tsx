import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../lib/auth'

type Lead = { id: number; property_id: number | null; name: string; phone: string; message: string | null; source: string; status: string; created_at: string }
type Page = { items: Lead[]; total: number; page: number; pageSize: number }

export const STATUS_LABEL: Record<string, string> = { new: 'Новая', in_progress: 'В работе', viewing: 'Просмотр назначен', closed: 'Закрыта', rejected: 'Отклонена' }
const SOURCE_LABEL: Record<string, string> = { site: 'Сайт', miniapp: 'Mini App', bot: 'Бот', assistant: 'ИИ-ассистент' }
const PAGE_SIZE = 20

export const fmtDate = (iso: string) => new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function AdminLeads() {
  const { api } = useAuth()
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const key = ['admin-leads', status, page]

  const q = useQuery({
    queryKey: key,
    queryFn: () => api<Page>(`/admin/leads?page=${page}&pageSize=${PAGE_SIZE}${status ? `&status=${status}` : ''}`),
    refetchInterval: 30_000, // новые заявки появляются без перезагрузки
  })
  const change = useMutation({
    mutationFn: ({ id, status: s }: { id: number; status: string }) => api<Lead>(`/admin/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status: s }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-leads'] }),
  })
  const pages = Math.max(1, Math.ceil((q.data?.total ?? 0) / PAGE_SIZE))

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">Заявки</h1>
          <p className="text-sm text-slate-500">{q.data ? `Всего: ${q.data.total}` : ' '}</p>
        </div>
        <label className="grid gap-1 text-sm text-slate-600">
          Статус
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900"
          >
            <option value="">Все</option>
            {Object.entries(STATUS_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      {q.isError && <p className="text-red-400">Не удалось загрузить заявки.</p>}
      {change.isError && <p className="text-red-400">Не удалось сменить статус.</p>}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Дата</th>
              <th className="px-4 py-3">Клиент</th>
              <th className="px-4 py-3">Телефон</th>
              <th className="px-4 py-3">Объект</th>
              <th className="px-4 py-3">Источник</th>
              <th className="px-4 py-3">Сообщение</th>
              <th className="px-4 py-3">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {q.data?.items.map((l) => (
              <tr key={l.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{fmtDate(l.created_at)}</td>
                <td className="px-4 py-3 font-medium">{l.name}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <a href={`tel:${l.phone}`} className="hover:underline">
                    {l.phone}
                  </a>
                </td>
                <td className="px-4 py-3">
                  {l.property_id ? (
                    <Link to={`/catalog/${l.property_id}`} target="_blank" className="text-brand-100 hover:underline">
                      №{l.property_id}
                    </Link>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3">{SOURCE_LABEL[l.source] ?? l.source}</td>
                <td className="max-w-xs px-4 py-3 text-slate-700">{l.message || <span className="text-slate-500">—</span>}</td>
                <td className="px-4 py-3">
                  <select
                    value={l.status}
                    aria-label={`Статус заявки ${l.id}`}
                    onChange={(e) => change.mutate({ id: l.id, status: e.target.value })}
                    disabled={change.isPending}
                    className="rounded-md border border-slate-300 bg-slate-100 px-2 py-1 text-sm text-slate-900"
                  >
                    {Object.entries(STATUS_LABEL).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {q.data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  Заявок пока нет.
                </td>
              </tr>
            )}
            {q.isPending && (
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
