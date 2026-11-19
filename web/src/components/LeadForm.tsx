import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
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

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (name.trim().length < 2) next.name = t('property.form.nameError')
    if (!PHONE_RE.test(phone.replace(/[\s()-]/g, ''))) next.phone = t('property.form.phoneError')
    setErrors(next)
    if (Object.keys(next).length) return

    // TODO шаг 2.4: отправка на сервер (POST /api/leads). Пока заявка только подтверждается на экране.
    void propertyId
    toast(t('property.form.sent'), 'success')
    onDone()
  }

  return (
    <form onSubmit={submit} className="grid gap-3" noValidate>
      <Input label={t('property.form.name')} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="name" />
      <Input label={t('property.form.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} type="tel" autoComplete="tel" inputMode="tel" />
      <Textarea label={t('property.form.message')} value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
      <Button type="submit" size="lg">
        {t('property.form.send')}
      </Button>
    </form>
  )
}
