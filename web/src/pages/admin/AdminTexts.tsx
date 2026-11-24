import { useState } from 'react'
import i18n from 'i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import ru from '../../locales/ru.json'
import uz from '../../locales/uz.json'
import { useAuth } from '../../lib/auth'
import type { TextMap } from '../../lib/siteTexts'

const DEFAULTS = { ru: ru.home as Record<string, string>, uz: uz.home as Record<string, string> }
const KEYS = Object.keys(DEFAULTS.ru)

const GROUPS: Array<{ title: string; match: (k: string) => boolean }> = [
  { title: 'Главный экран', match: (k) => ['eyebrow', 'heroLine1', 'heroLine2', 'title', 'subtitle', 'toCatalog', 'askAssistant', 'searchBtn'].includes(k) },
  { title: 'Цифры', match: (k) => k.startsWith('stat') },
  { title: 'Почему TashHome', match: (k) => k.startsWith('why') },
  { title: 'Блок ассистента', match: (k) => k.startsWith('ai') },
  { title: 'Как это работает', match: (k) => k.startsWith('step') },
  { title: 'Подвал страницы', match: (k) => k.startsWith('cta') },
  { title: 'Заголовки разделов', match: (k) => ['districts', 'fresh', 'all'].includes(k) },
]

type RowProps = { k: string; lang: 'ru' | 'uz'; saved: string | undefined; onSave: (lang: 'ru' | 'uz', key: string, value: string | null) => Promise<void> }

function Cell({ k, lang, saved, onSave }: RowProps) {
  const base = DEFAULTS[lang][k] ?? ''
  const [value, setValue] = useState(saved ?? base)
  const [busy, setBusy] = useState(false)
  const changed = value !== (saved ?? base)
  const isCustom = saved !== undefined
  const run = async (v: string | null) => {
    setBusy(true)
    try {
      await onSave(lang, k, v)
      if (v === null) setValue(base)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="grid gap-1">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={value.length > 70 ? 3 : 2}
        maxLength={600}
        aria-label={`${k} (${lang === 'ru' ? 'русский' : 'узбекский'})`}
        className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-white"
      />
      <div className="flex items-center gap-2 text-xs">
        <button type="button" disabled={!changed || busy} onClick={() => run(value.trim() === base ? null : value)} className="rounded-md bg-white px-3 py-1 font-medium text-black disabled:opacity-30">
          Сохранить
        </button>
        {isCustom && (
          <button type="button" disabled={busy} onClick={() => run(null)} className="rounded-md border border-slate-300 px-3 py-1 text-slate-600 hover:bg-slate-200">
            Вернуть стандартный
          </button>
        )}
        {isCustom && <span className="text-emerald-400">изменён</span>}
      </div>
    </div>
  )
}

/** Редактор текстов главной страницы: русская и узбекская версии рядом, изменения видны на сайте сразу после сохранения. */
export default function AdminTexts() {
  const { api } = useAuth()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin-texts'], queryFn: () => api<TextMap>('/admin/texts') })
  const [error, setError] = useState('')

  const save = useMutation({
    mutationFn: ({ lang, key, value }: { lang: 'ru' | 'uz'; key: string; value: string | null }) => api('/admin/texts', { method: 'PUT', body: JSON.stringify({ lang, key: `home.${key}`, value }) }),
  })
  const onSave: RowProps['onSave'] = async (lang, key, value) => {
    setError('')
    try {
      await save.mutateAsync({ lang, key, value })
      i18n.addResource(lang, 'translation', `home.${key}`, value ?? DEFAULTS[lang][key])
      await qc.invalidateQueries({ queryKey: ['admin-texts'] })
    } catch {
      setError('Не удалось сохранить текст. Проверьте соединение и права.')
    }
  }

  if (q.isPending) return <p className="text-slate-500">Загрузка…</p>
  if (q.isError) return <p className="text-red-400">Не удалось загрузить тексты.</p>
  const grouped = GROUPS.map((g) => ({ ...g, keys: KEYS.filter(g.match) })).filter((g) => g.keys.length)

  return (
    <section className="grid gap-5">
      <div>
        <h1 className="text-3xl">Тексты сайта</h1>
        <p className="text-sm text-slate-500">Тексты главной страницы на двух языках. Изменения сохраняются в базе и сразу видны посетителям.</p>
      </div>
      {error && <p role="alert" className="text-red-400">{error}</p>}
      {grouped.map((g) => (
        <section key={g.title} className="rounded-xl border border-slate-200 bg-slate-100 p-4">
          <h2 className="mb-3 text-base font-semibold">{g.title}</h2>
          <div className="grid gap-4">
            {g.keys.map((k) => (
              <div key={k} className="grid gap-2 border-b border-slate-200 pb-4 last:border-0 last:pb-0 lg:grid-cols-[10rem_1fr_1fr]">
                <code className="text-xs text-slate-500">{k}</code>
                <Cell k={k} lang="ru" saved={q.data.ru[`home.${k}`]} onSave={onSave} />
                <Cell k={k} lang="uz" saved={q.data.uz[`home.${k}`]} onSave={onSave} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </section>
  )
}
