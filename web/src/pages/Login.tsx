import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth'
import Button from '../components/ui/Button'
import { Input } from '../components/ui/Field'

const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
const ERRORS = ['bad_credentials', 'user_exists', 'weak_password', 'too_many', 'confirm_email'] as const
const MIN_PASSWORD = 8

/** Вход и регистрация клиента по почте и паролю. Сотрудники входят на /admin/login. */
export default function Login() {
  const { t } = useTranslation()
  const { loggedIn, login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loggedIn) return <Navigate to="/account" replace />
  const isRegister = mode === 'register'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (isRegister) await register(name.trim(), email.trim(), password)
      else await login(email.trim(), password)
    } catch (err) {
      const code = err instanceof Error ? err.message : ''
      setError(t(`account.error_${(ERRORS as readonly string[]).includes(code) ? code : 'failed'}`))
    } finally {
      setBusy(false)
    }
  }

  const tab = (value: typeof mode, label: string) => (
    <button
      type="button"
      aria-pressed={mode === value}
      onClick={() => {
        setMode(value)
        setError('')
      }}
      className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${mode === value ? 'bg-white font-semibold text-black' : 'text-slate-600 hover:bg-slate-200'}`}
    >
      {label}
    </button>
  )

  return (
    <div className="mx-auto grid max-w-md gap-6 py-10">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl">{t('account.loginTitle')}</h1>
        <p className="mt-2 text-slate-600">{t('account.loginText')}</p>
      </div>

      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-100 p-5">
        <div className="flex gap-1 rounded-xl border border-slate-300 p-1">
          {tab('login', t('account.tabLogin'))}
          {tab('register', t('account.tabRegister'))}
        </div>
        {isRegister && <Input label={t('account.name')} required maxLength={60} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}
        <Input label={t('account.email')} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          label={isRegister ? t('account.newPassword', { count: MIN_PASSWORD }) : t('account.password')}
          type="password"
          required
          minLength={isRegister ? MIN_PASSWORD : undefined}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" loading={busy} disabled={!configured}>
          {isRegister ? t('account.signUp') : t('account.login')}
        </Button>
        {!configured && <p className="text-center text-sm text-red-400">{t('account.notConfigured')}</p>}
      </form>

      <p className="text-center text-sm text-slate-500">
        {t('account.staff')}{' '}
        <Link to="/admin/login" className="underline-offset-2 hover:text-slate-800 hover:underline">
          {t('account.staffLink')}
        </Link>
      </p>
    </div>
  )
}
