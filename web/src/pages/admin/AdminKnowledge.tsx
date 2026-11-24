import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminApiError, useAuth } from '../../lib/auth'
import { fmtDate } from './AdminLeads'

type Doc = { id: number; title: string; source_file: string | null; chunks: number; created_at: string }

const MAX_FILE = 200 * 1024
const input = 'w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-white'

/** База знаний ассистента: документ загружается текстом или файлом .md/.txt, режется на фрагменты и индексируется. */
export default function AdminKnowledge() {
  const { api } = useAuth()
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const list = useQuery({ queryKey: ['admin-kb'], queryFn: () => api<Doc[]>('/admin/kb'), retry: false })
  const add = useMutation({
    mutationFn: () => api<Doc>('/admin/kb', { method: 'POST', body: JSON.stringify({ title, content }) }),
    onSuccess: (d) => {
      setMsg({ ok: true, text: `Документ добавлен и проиндексирован: ${d.chunks} фрагм.` })
      setTitle('')
      setContent('')
      qc.invalidateQueries({ queryKey: ['admin-kb'] })
    },
    onError: (e) => setMsg({ ok: false, text: e instanceof AdminApiError && e.status === 400 ? 'Проверьте название и текст (от 50 до 30 000 символов).' : e instanceof AdminApiError && e.status === 503 ? 'ИИ сейчас недоступен, попробуйте позже.' : 'Не удалось добавить документ.' }),
  })
  const del = useMutation({
    mutationFn: (id: number) => api(`/admin/kb/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-kb'] }),
  })

  const onFile = async (f: File | undefined) => {
    if (!f) return
    if (f.size > MAX_FILE) return setMsg({ ok: false, text: 'Файл больше 200 КБ.' })
    setContent(await f.text())
    if (!title) setTitle(f.name.replace(/\.(md|txt)$/i, ''))
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    setMsg(null)
    add.mutate()
  }

  if (list.isError && list.error instanceof AdminApiError && list.error.status === 403) {
    return <p className="text-slate-600">База знаний доступна только администратору.</p>
  }

  return (
    <section className="grid gap-5">
      <div>
        <h1 className="text-3xl">База знаний</h1>
        <p className="text-sm text-slate-500">Из этих документов ассистент берёт ответы на вопросы о сделке, документах, налогах и ипотеке.</p>
      </div>

      <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-100 p-4">
        <h2 className="text-base font-semibold">Добавить документ</h2>
        <input className={input} placeholder="Название" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} required aria-label="Название документа" />
        <textarea className={input} rows={9} placeholder="Вставьте текст документа или выберите файл ниже" value={content} onChange={(e) => setContent(e.target.value)} maxLength={30000} required aria-label="Текст документа" />
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-200">
            Выбрать файл .md или .txt
            <input type="file" accept=".md,.txt,text/plain,text/markdown" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
          </label>
          <button type="submit" disabled={add.isPending} className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-black disabled:opacity-50">
            {add.isPending ? 'Индексирую…' : 'Добавить и проиндексировать'}
          </button>
          <span className="text-xs text-slate-500">{content.length} / 30 000 символов</span>
        </div>
        {msg && (
          <p role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'text-sm text-emerald-400' : 'text-sm text-red-400'}>
            {msg.text}
          </p>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Документ</th>
              <th className="px-4 py-3">Фрагментов</th>
              <th className="px-4 py-3">Добавлен</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {list.data?.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-3 font-medium">
                  {d.title}
                  {d.source_file && <span className="ml-2 text-xs text-slate-500">{d.source_file}</span>}
                </td>
                <td className="px-4 py-3">{d.chunks}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{fmtDate(d.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => window.confirm(`Удалить документ «${d.title}»? Ассистент перестанет использовать его в ответах.`) && del.mutate(d.id)}
                    disabled={del.isPending}
                    className="rounded-md border border-slate-300 px-3 py-1 text-slate-600 hover:bg-slate-200"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
            {list.data?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Документов пока нет.
                </td>
              </tr>
            )}
            {list.isPending && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Загрузка…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
