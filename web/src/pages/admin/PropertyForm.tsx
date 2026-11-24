import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { HOUSE_PHOTOS } from '../../data/photos'
import { DISTRICTS } from '../../data/properties'
import { useAuth } from '../../lib/auth'

export type AdminProperty = {
  id: number
  deal_type: 'sale' | 'rent'
  title_ru: string
  title_uz: string
  description_ru: string | null
  description_uz: string | null
  district_id: string
  address: string | null
  lat: number | null
  lng: number | null
  price_usd: number
  area_m2: number
  land_sotka: number
  rooms: number
  floors: number
  building_type: 'brick' | 'block' | 'monolith'
  renovation: 'none' | 'basic' | 'euro' | 'designer'
  year_built: number | null
  status: 'active' | 'sold' | 'hidden'
  predicted_price_usd: number | null
  price_label: 'below' | 'fair' | 'above' | null
  photos: string[]
}

type Draft = Omit<AdminProperty, 'id' | 'predicted_price_usd' | 'price_label'>

const EMPTY: Draft = {
  deal_type: 'sale', title_ru: '', title_uz: '', description_ru: '', description_uz: '', district_id: 'yunusabad', address: '', lat: null, lng: null,
  price_usd: 100000, area_m2: 120, land_sotka: 6, rooms: 4, floors: 2, building_type: 'brick', renovation: 'euro', year_built: 2015, status: 'active', photos: [],
}

const inputCls = 'w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-white'

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  )
}

const numberOrNull = (v: string) => (v.trim() === '' ? null : Number(v))

/** Форма дома: создание и правка. После сохранения сервер сам пересчитывает метку цены и вектор для поиска. */
export default function PropertyForm({ initial, onClose }: { initial: AdminProperty | null; onClose: () => void }) {
  const { api } = useAuth()
  const qc = useQueryClient()
  const [d, setD] = useState<Draft>(() => (initial ? { ...EMPTY, ...initial } : EMPTY))
  const [message, setMessage] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }))

  const payload = () => ({
    ...d,
    address: d.address?.trim() || null,
    description_ru: d.description_ru?.trim() || null,
    description_uz: d.description_uz?.trim() || null,
  })

  const save = useMutation({
    mutationFn: () => (initial ? api<AdminProperty>(`/admin/properties/${initial.id}`, { method: 'PATCH', body: JSON.stringify(payload()) }) : api<AdminProperty>('/admin/properties', { method: 'POST', body: JSON.stringify(payload()) })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-properties'] })
      qc.invalidateQueries({ queryKey: ['properties'] })
      qc.invalidateQueries({ queryKey: ['home-houses'] })
      onClose()
    },
    onError: (e) => setMessage({ kind: 'error', text: explain(e) }),
  })

  const describe = useMutation({
    mutationFn: () =>
      api<{ ru: string; uz: string }>('/admin/properties/describe', {
        method: 'POST',
        body: JSON.stringify({ deal_type: d.deal_type, district_id: d.district_id, address: d.address?.trim() || null, area_m2: d.area_m2, land_sotka: d.land_sotka, rooms: d.rooms, floors: d.floors, building_type: d.building_type, renovation: d.renovation, year_built: d.year_built }),
      }),
    onSuccess: (r) => {
      setD((s) => ({ ...s, description_ru: r.ru, description_uz: r.uz }))
      setMessage({ kind: 'ok', text: 'Описание создано. Прочитайте и поправьте текст перед сохранением.' })
    },
    onError: (e) => setMessage({ kind: 'error', text: explain(e) }),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    save.mutate()
  }
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    setMessage(null)
    const added: string[] = []
    let failed = 0
    for (const f of Array.from(files).slice(0, 12)) {
      if (f.size > 5 * 1024 * 1024) {
        failed++
        continue
      }
      try {
        const r = await api<{ url: string }>('/admin/uploads', { method: 'POST', body: f, headers: { 'content-type': f.type || 'application/octet-stream' } })
        added.push(r.url)
      } catch {
        failed++
      }
    }
    setD((s) => ({ ...s, photos: [...s.photos, ...added].slice(0, 12) }))
    setUploading(false)
    if (failed) setMessage({ kind: 'error', text: `Не загружено файлов: ${failed}. Допустимы JPG, PNG, WebP до 5 МБ.` })
  }
  const togglePhoto = (url: string) => set('photos', d.photos.includes(url) ? d.photos.filter((p) => p !== url) : [...d.photos, url].slice(0, 12))
  const move = (i: number, dir: -1 | 1) => {
    const next = [...d.photos]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    set('photos', next)
  }
  const library = Array.from(new Set([...HOUSE_PHOTOS, ...[29, 30, 31, 32].map((n) => `/houses/house-${n}.jpg`)]))

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">{initial ? `Дом №${initial.id}` : 'Новый дом'}</h1>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-200">
            Отмена
          </button>
          <button type="submit" disabled={save.isPending} className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-black disabled:opacity-50">
            {save.isPending ? 'Сохраняю…' : 'Сохранить'}
          </button>
        </div>
      </div>

      {message && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${message.kind === 'error' ? 'border-red-500/40 text-red-400' : 'border-emerald-500/40 text-emerald-400'}`}>
          {message.text}
        </p>
      )}

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Тип сделки">
          <select className={inputCls} value={d.deal_type} onChange={(e) => set('deal_type', e.target.value as Draft['deal_type'])}>
            <option value="sale">Продажа</option>
            <option value="rent">Аренда</option>
          </select>
        </Field>
        <Field label="Район">
          <select className={inputCls} value={d.district_id} onChange={(e) => set('district_id', e.target.value)}>
            {DISTRICTS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.ru}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Статус">
          <select className={inputCls} value={d.status} onChange={(e) => set('status', e.target.value as Draft['status'])}>
            <option value="active">В продаже</option>
            <option value="sold">Продан</option>
            <option value="hidden">Скрыт</option>
          </select>
        </Field>
        <Field label={d.deal_type === 'rent' ? 'Цена в месяц, $' : 'Цена, $'}>
          <input className={inputCls} type="number" min={1} required value={d.price_usd} onChange={(e) => set('price_usd', Number(e.target.value))} />
        </Field>
        <Field label="Площадь дома, м²">
          <input className={inputCls} type="number" min={20} step="0.1" required value={d.area_m2} onChange={(e) => set('area_m2', Number(e.target.value))} />
        </Field>
        <Field label="Участок, соток">
          <input className={inputCls} type="number" min={0} step="0.1" required value={d.land_sotka} onChange={(e) => set('land_sotka', Number(e.target.value))} />
        </Field>
        <Field label="Комнат">
          <input className={inputCls} type="number" min={1} max={20} required value={d.rooms} onChange={(e) => set('rooms', Number(e.target.value))} />
        </Field>
        <Field label="Этажей">
          <input className={inputCls} type="number" min={1} max={10} required value={d.floors} onChange={(e) => set('floors', Number(e.target.value))} />
        </Field>
        <Field label="Материал стен">
          <select className={inputCls} value={d.building_type} onChange={(e) => set('building_type', e.target.value as Draft['building_type'])}>
            <option value="brick">Кирпичный</option>
            <option value="block">Блочный</option>
            <option value="monolith">Монолитный</option>
          </select>
        </Field>
        <Field label="Ремонт">
          <select className={inputCls} value={d.renovation} onChange={(e) => set('renovation', e.target.value as Draft['renovation'])}>
            <option value="none">Без ремонта</option>
            <option value="basic">Косметический</option>
            <option value="euro">Евроремонт</option>
            <option value="designer">Дизайнерский</option>
          </select>
        </Field>
        <Field label="Год постройки">
          <input className={inputCls} type="number" min={1800} max={2100} value={d.year_built ?? ''} onChange={(e) => set('year_built', numberOrNull(e.target.value))} />
        </Field>
        <Field label="Адрес">
          <input className={inputCls} value={d.address ?? ''} maxLength={200} onChange={(e) => set('address', e.target.value)} />
        </Field>
        <Field label="Широта" hint="для карты, например 41.31">
          <input className={inputCls} type="number" step="any" value={d.lat ?? ''} onChange={(e) => set('lat', numberOrNull(e.target.value))} />
        </Field>
        <Field label="Долгота" hint="например 69.24">
          <input className={inputCls} type="number" step="any" value={d.lng ?? ''} onChange={(e) => set('lng', numberOrNull(e.target.value))} />
        </Field>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-100 p-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Название (русский)">
            <input className={inputCls} required minLength={3} maxLength={200} value={d.title_ru} onChange={(e) => set('title_ru', e.target.value)} />
          </Field>
          <Field label="Название (узбекский)">
            <input className={inputCls} required minLength={3} maxLength={200} value={d.title_uz} onChange={(e) => set('title_uz', e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => describe.mutate()} disabled={describe.isPending} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-200 disabled:opacity-50">
            {describe.isPending ? 'Пишу описание…' : 'Сгенерировать описание ИИ'}
          </button>
          <span className="text-xs text-slate-500">Используются только указанные выше характеристики. Текст можно править.</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="Описание (русский)">
            <textarea className={inputCls} rows={5} maxLength={3000} value={d.description_ru ?? ''} onChange={(e) => set('description_ru', e.target.value)} />
          </Field>
          <Field label="Описание (узбекский)">
            <textarea className={inputCls} rows={5} maxLength={3000} value={d.description_uz ?? ''} onChange={(e) => set('description_uz', e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-100 p-4">
        <div>
          <h2 className="text-base font-semibold">Фото ({d.photos.length} из 12)</h2>
          <p className="text-xs text-slate-500">Первое фото главное. Загрузите свои файлы, выберите из библиотеки сайта или вставьте адрес https://…</p>
        </div>
        {d.photos.length > 0 && (
          <ol className="flex flex-wrap gap-3">
            {d.photos.map((url, i) => (
              <li key={url} className="w-36">
                <img src={url} alt={`Фото ${i + 1}`} className="aspect-[4/3] w-full rounded-md object-cover" />
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{i === 0 ? 'главное' : i + 1}</span>
                  <span className="flex gap-1">
                    <button type="button" aria-label="Сдвинуть влево" onClick={() => move(i, -1)} className="rounded border border-slate-300 px-1.5 hover:bg-slate-200">
                      ←
                    </button>
                    <button type="button" aria-label="Сдвинуть вправо" onClick={() => move(i, 1)} className="rounded border border-slate-300 px-1.5 hover:bg-slate-200">
                      →
                    </button>
                    <button type="button" aria-label="Убрать фото" onClick={() => togglePhoto(url)} className="rounded border border-slate-300 px-1.5 hover:bg-slate-200">
                      ×
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div>
          <label className={`inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-200 ${uploading || d.photos.length >= 12 ? 'pointer-events-none opacity-50' : ''}`}>
            {uploading ? 'Загружаю…' : 'Загрузить фото с компьютера'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => {
                void onFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
          <span className="ml-3 text-xs text-slate-500">JPG, PNG или WebP до 5 МБ</span>
        </div>
        <details>
          <summary className="cursor-pointer text-sm text-slate-700">Библиотека фото сайта ({library.length})</summary>
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
            {library.map((url) => {
              const on = d.photos.includes(url)
              return (
                <li key={url}>
                  <button type="button" onClick={() => togglePhoto(url)} aria-pressed={on} className={`relative block w-full overflow-hidden rounded-md border-2 ${on ? 'border-white' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                    <img src={url.replace('/houses/', '/houses/thumb/')} alt="" className="aspect-square w-full object-cover" />
                    {on && <span className="absolute right-1 top-1 rounded bg-white px-1 text-xs text-black">✓</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </details>
        <AddUrl onAdd={(u) => d.photos.length < 12 && !d.photos.includes(u) && set('photos', [...d.photos, u])} />
      </div>
    </form>
  )
}

function AddUrl({ onAdd }: { onAdd: (u: string) => void }) {
  const [v, setV] = useState('')
  const ok = /^https:\/\/\S+$/.test(v.trim())
  return (
    <div className="flex gap-2">
      <input className={inputCls} placeholder="https://…" value={v} onChange={(e) => setV(e.target.value)} aria-label="Адрес фото" />
      <button
        type="button"
        disabled={!ok}
        onClick={() => {
          onAdd(v.trim())
          setV('')
        }}
        className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-200 disabled:opacity-40"
      >
        Добавить
      </button>
    </div>
  )
}

function explain(e: unknown): string {
  const status = (e as { status?: number })?.status
  if (status === 400) return 'Проверьте поля формы: часть значений не подходит (цена, площадь, адрес фото и другие).'
  if (status === 403) return 'Недостаточно прав.'
  if (status === 429) return 'Слишком много запросов, подождите минуту.'
  if (status === 503) return 'ИИ сейчас недоступен, попробуйте позже.'
  return 'Не удалось выполнить действие. Проверьте соединение с сервером.'
}

