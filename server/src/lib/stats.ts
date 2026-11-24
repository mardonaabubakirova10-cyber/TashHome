import type { StatsData } from './store.js'

export type Stats = {
  leads: {
    total: number
    last7: number
    prev7: number
    byDay: Array<{ date: string; count: number }> // последние 30 дней, включая пустые
    bySource: Record<string, number>
    byStatus: Record<string, number>
  }
  properties: { active: number; byDistrict: Array<{ district_id: string; count: number }> }
  reviews: { total: number; avgRating: number | null; bySentiment: Record<string, number>; byTopic: Record<string, number> }
  assistant: {
    answers: number
    avgLatencyMs: number | null
    up: number
    down: number
    helpfulPercent: number | null
    unanswered: Array<{ question: string; date: string }> // вопросы, на которые в базе знаний нет ответа
  }
}

const day = (iso: string) => iso.slice(0, 10)
const count = <T,>(items: T[], key: (x: T) => string | null) => {
  const out: Record<string, number> = {}
  for (const i of items) {
    const k = key(i)
    if (k) out[k] = (out[k] ?? 0) + 1
  }
  return out
}

type ToolLog = { name?: string; ok?: boolean; summary?: string }
const toolLogs = (v: unknown): ToolLog[] => (Array.isArray(v) ? (v as ToolLog[]) : [])

/** Статистика для дашборда из сырых данных. now передаётся для тестов. */
export function buildStats(d: StatsData, now = new Date()): Stats {
  const DAY = 86_400_000
  const t0 = new Date(day(now.toISOString())).getTime()
  const byDayMap = count(d.leads, (l) => day(l.created_at))
  const byDay = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(t0 - (29 - i) * DAY).toISOString().slice(0, 10)
    return { date, count: byDayMap[date] ?? 0 }
  })
  const inRange = (iso: string, from: number, to: number) => {
    const t = new Date(iso).getTime()
    return t >= from && t < to
  }

  const rated = d.reviews.filter((r) => r.rating >= 1)
  const answers = d.chat.filter((m) => m.role === 'assistant')
  const latencies = answers.map((m) => m.latency_ms).filter((x): x is number => typeof x === 'number')
  const up = answers.filter((m) => m.rating === 1).length
  const down = answers.filter((m) => m.rating === -1).length

  // «Без ответа»: ответы ассистента, где search_knowledge вернул found=false. Вопрос — предыдущее сообщение пользователя (чат идёт от новых к старым).
  const unanswered: Stats['assistant']['unanswered'] = []
  d.chat.forEach((m, i) => {
    if (m.role !== 'assistant') return
    if (!toolLogs(m.tool_calls).some((t) => t.name === 'search_knowledge' && t.summary?.includes('"found":false'))) return
    const q = d.chat.slice(i + 1).find((x) => x.role === 'user')
    if (q?.content) unanswered.push({ question: q.content.slice(0, 200), date: m.created_at })
  })

  return {
    leads: {
      total: d.leads.length,
      last7: d.leads.filter((l) => inRange(l.created_at, t0 - 6 * DAY, t0 + DAY)).length,
      prev7: d.leads.filter((l) => inRange(l.created_at, t0 - 13 * DAY, t0 - 6 * DAY)).length,
      byDay,
      bySource: count(d.leads, (l) => l.source),
      byStatus: count(d.leads, (l) => l.status),
    },
    properties: {
      active: d.properties.filter((p) => p.status === 'active').length,
      byDistrict: Object.entries(count(d.properties.filter((p) => p.status === 'active'), (p) => p.district_id))
        .map(([district_id, c]) => ({ district_id, count: c }))
        .sort((a, b) => b.count - a.count),
    },
    reviews: {
      total: d.reviews.length,
      avgRating: rated.length ? Math.round((rated.reduce((s, r) => s + r.rating, 0) / rated.length) * 10) / 10 : null,
      bySentiment: count(d.reviews, (r) => r.sentiment),
      byTopic: count(d.reviews, (r) => r.topic),
    },
    assistant: {
      answers: answers.length,
      avgLatencyMs: latencies.length ? Math.round(latencies.reduce((s, x) => s + x, 0) / latencies.length) : null,
      up,
      down,
      helpfulPercent: up + down ? Math.round((up / (up + down)) * 100) : null,
      unanswered: unanswered.slice(0, 20),
    },
  }
}
