import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ApiError, getReviews, postReview } from '../lib/api'
import Button from './ui/Button'
import { Input, Textarea } from './ui/Field'
import Modal from './ui/Modal'
import { useToast } from './ui/Toast'

function Stars({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={className} role="img" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? 'text-white' : 'text-slate-400'}>
          ★
        </span>
      ))}
    </span>
  )
}

function ReviewForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const [rating, setRating] = useState(0)
  const [author, setAuthor] = useState('')
  const [text, setText] = useState('')
  const [errors, setErrors] = useState<{ rating?: string; text?: string }>({})

  const m = useMutation({
    mutationFn: postReview,
    onSuccess: () => {
      toast(t('reviews.sent'), 'success')
      qc.invalidateQueries({ queryKey: ['reviews'] })
      onDone()
    },
    onError: (e) => toast(e instanceof ApiError && e.status === 429 ? t('reviews.tooMany') : t('reviews.error'), 'error'),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (rating < 1) next.rating = t('reviews.ratingError')
    if (text.trim().length < 3) next.text = t('reviews.textError')
    setErrors(next)
    if (Object.keys(next).length) return
    m.mutate({ rating, text: text.trim(), author: author.trim() || undefined })
  }

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-slate-700">{t('reviews.rating')}</legend>
        <div className="flex gap-1" role="radiogroup" aria-label={t('reviews.rating')}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n}`}
              onClick={() => setRating(n)}
              className={`text-3xl leading-none transition-colors focus-visible:outline-2 focus-visible:outline-white ${n <= rating ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              ★
            </button>
          ))}
        </div>
        {errors.rating && <p className="mt-1 text-xs text-red-600">{errors.rating}</p>}
      </fieldset>
      <Input label={t('reviews.name')} value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={60} autoComplete="given-name" />
      <Textarea label={t('reviews.text')} value={text} onChange={(e) => setText(e.target.value)} error={errors.text} maxLength={2000} rows={4} />
      <Button type="submit" size="lg" disabled={m.isPending}>
        {m.isPending ? t('reviews.sending') : t('reviews.send')}
      </Button>
    </form>
  )
}

/** Блок отзывов: последние отзывы с сервера и форма «Оставить отзыв». */
export default function Reviews() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const q = useQuery({ queryKey: ['reviews'], queryFn: getReviews, retry: 1 })
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(i18n.language === 'uz' ? 'uz-UZ' : 'ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <section>
      <div className="mb-8 flex items-end justify-between gap-4 border-b border-slate-300 pb-4">
        <h2 className="text-3xl sm:text-4xl">{t('reviews.title')}</h2>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          {t('reviews.leave')}
        </Button>
      </div>

      {q.isPending && <p className="text-slate-600">{t('reviews.loading')}</p>}
      {q.isError && <p className="text-slate-600">{t('reviews.loadError')}</p>}
      {q.data && q.data.length === 0 && <p className="text-slate-600">{t('reviews.empty')}</p>}
      {q.data && q.data.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.slice(0, 6).map((r) => (
            <li key={r.id} className="flex flex-col rounded-xl bg-slate-100 p-5 ring-1 ring-white/10">
              <Stars value={r.rating} className="text-lg tracking-wider" />
              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-800">{r.text}</p>
              <p className="mt-4 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{r.author || t('reviews.anonymous')}</span> · {fmt(r.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('reviews.formTitle')}>
        <ReviewForm onDone={() => setOpen(false)} />
      </Modal>
    </section>
  )
}
