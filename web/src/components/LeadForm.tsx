import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ApiError, postLead } from '../lib/api'
import Button from './ui/Button'
import { Input, Textarea } from './ui/Field'
import { useToast } from './ui/Toast'

const PHONE_RE = /^\+998\d{9}$/

export default function LeadForm({ propertyId, onDone }: { propertyId: number; onDone: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('+998')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})

  const m = useMutation({
    mutationFn: postLead,
    onSuccess: () => {
      toast(t('property.form.sent'), 'success')
      onDone()
    },
    onError: (e) => {
      // сервер мог отклонить поле, которое на клиенте прошло проверку
      if (e instanceof ApiError && e.status === 400) {
        setErrors({ name: e.fields.name ? t('property.form.nameError') : undefined, phone: e.fields.phone ? t('property.form.phoneError') : undefined })
      } else {
        toast(t('property.form.error'), 'error')
      }
    },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (name.trim().length < 2) next.name = t('property.form.nameError')
    if (!PHONE_RE.test(phone.replace(/[\s()-]/g, ''))) next.phone = t('property.form.phoneError')
    setErrors(next)
    if (Object.keys(next).length) return

    m.mutate({ property_id: propertyId, name: name.trim(), phone: phone.replace(/[\s()-]/g, ''), message: message.trim() || undefined })
  }

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      <Input label={t('property.form.name')} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="name" />
      <Input label={t('property.form.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} type="tel" autoComplete="tel" inputMode="tel" />
      <Textarea label={t('property.form.message')} value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
      <Button type="submit" size="lg" disabled={m.isPending}>
        {t('property.form.send')}
      </Button>
    </form>
  )
}
