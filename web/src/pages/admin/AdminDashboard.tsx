import { useQuery } from '@tanstack/react-query'
import { DISTRICTS } from '../../data/properties'
import { useAuth } from '../../lib/auth'
import { fmtDate, STATUS_LABEL } from './AdminLeads'

type Stats = {
  leads: { total: number; last7: number; prev7: number; byDay: Array<{ date: string; count: number }>; bySource: Record<string, number>; byStatus: Record<string, number> }
  properties: { active: number; byDistrict: Array<{ district_id: string; count: number }> }
  reviews: { total: number; avgRating: number | null; bySentiment: Record<string, number>; byTopic: Record<string, number> }
  assistant: { answers: number; avgLatencyMs: number | null; up: number; down: number; helpfulPercent: number | null; unanswered: Array<{ question: string; date: string }> }
}

const SOURCE: Record<string, string> = { site: 'Сайт', miniapp: 'Mini App', bot: 'Бот', assistant: 'ИИ-ассистент' }
const SENTIMENT: Record<string, string> = { positive: 'Положительные', neutral: 'Нейтральные', negative: 'Негативные' }
const TOPIC: Record<string, string> = { service: 'Обслуживание', price: 'Цена', property: 'Дом', manager: 'Менеджер', other: 'Другое' }

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-100 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

/** Горизонтальные полосы: значение, подпись, доля от максимума. */
function Bars({ rows, empty = 'Данных пока нет' }: { rows: Array<{ label: string; value: number }>; empty?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (!rows.length) return <p className="text-sm text-slate-500">{empty}</p>
  return (
    <ul className="grid gap-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="truncate text-slate-700">{r.label}</span>
          <span className="h-2 rounded-full bg-slate-200" aria-hidden>
            <span className="block h-2 rounded-full bg-white" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums text-slate-600">{r.value}</span>
        </li>
      ))}
    </ul>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-100 p-4">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export default function AdminDashboard() {
  const { api } = useAuth()
  const q = useQuery({ queryKey: ['admin-stats'], queryFn: () => api<Stats>('/admin/stats'), refetchInterval: 60_000 })

  if (q.isPending) return <p className="text-slate-500">Загрузка…</p>
  if (q.isError) return <p className="text-red-400">Не удалось загрузить статистику.</p>
  const s = q.data
  const delta = s.leads.last7 - s.leads.prev7
  const maxDay = Math.max(1, ...s.leads.byDay.map((d) => d.count))
  const districtName = (id: string) => DISTRICTS.find((d) => d.id === id)?.ru ?? id

  return (
    <div className="grid gap-5">
      <h1 className="text-3xl">Обзор</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Заявок за 7 дней" value={s.leads.last7} hint={`${delta >= 0 ? '+' : ''}${delta} к предыдущей неделе`} />
        <Tile label="Активных домов" value={s.properties.active} />
        <Tile label="Средняя оценка" value={s.reviews.avgRating ?? '—'} hint={`отзывов: ${s.reviews.total}`} />
        <Tile
          label="Ответы ассистента полезны"
          value={s.assistant.helpfulPercent === null ? '—' : `${s.assistant.helpfulPercent}%`}
          hint={`ответов: ${s.assistant.answers}${s.assistant.avgLatencyMs ? `, в среднем ${(s.assistant.avgLatencyMs / 1000).toFixed(1)} с` : ''}`}
        />
      </div>

      <Card title="Заявки по дням (30 дней)">
        <div className="flex h-36 items-end gap-1" role="img" aria-label={`Заявки по дням, всего ${s.leads.byDay.reduce((a, d) => a + d.count, 0)}`}>
          {s.leads.byDay.map((d) => (
            <div key={d.date} className="group relative flex h-full flex-1 items-end" title={`${d.date}: ${d.count}`}>
              <div className="w-full rounded-t bg-white" style={{ height: `${d.count ? Math.max(6, (d.count / maxDay) * 100) : 2}%`, opacity: d.count ? 1 : 0.25 }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>{s.leads.byDay[0]?.date}</span>
          <span>{s.leads.byDay.at(-1)?.date}</span>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Заявки по источникам">
          <Bars rows={Object.entries(s.leads.bySource).map(([k, v]) => ({ label: SOURCE[k] ?? k, value: v }))} />
        </Card>
        <Card title="Заявки по статусам">
          <Bars rows={Object.entries(s.leads.byStatus).map(([k, v]) => ({ label: STATUS_LABEL[k] ?? k, value: v }))} />
        </Card>
        <Card title="Отзывы по тональности">
          <Bars rows={Object.entries(s.reviews.bySentiment).map(([k, v]) => ({ label: SENTIMENT[k] ?? k, value: v }))} />
          <h3 className="mb-2 mt-4 text-sm font-medium text-slate-600">По темам</h3>
          <Bars rows={Object.entries(s.reviews.byTopic).map(([k, v]) => ({ label: TOPIC[k] ?? k, value: v }))} />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Дома по районам">
          <Bars rows={s.properties.byDistrict.map((d) => ({ label: districtName(d.district_id), value: d.count }))} />
        </Card>
        <Card title="Вопросы без ответа в базе знаний">
          {s.assistant.unanswered.length === 0 ? (
            <p className="text-sm text-slate-500">Таких вопросов пока нет.</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {s.assistant.unanswered.map((u, i) => (
                <li key={i} className="flex justify-between gap-3 border-b border-slate-200 pb-2 last:border-0">
                  <span className="text-slate-800">{u.question}</span>
                  <span className="shrink-0 text-xs text-slate-500">{fmtDate(u.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
