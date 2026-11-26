import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

const MESSAGES: Record<string, string> = {
  bad_credentials: 'Неверный логин или пароль.',
  not_configured: 'Вход не настроен: в .env нет VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY.',
  failed: 'Не удалось войти. Попробуйте позже.',
}

// Supabase входит только по почте, поэтому к короткому логину добавляется служебный домен: admin555 → admin555@tashhome.local
const LOGIN_DOMAIN = 'tashhome.local'
const toEmail = (login: string) => (login.includes('@') ? login : `${login}@${LOGIN_DOMAIN}`)

export default function AdminLogin() {
  const { loggedIn, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loggedIn) return <Navigate to="/admin" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(toEmail(email.trim()), password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(MESSAGES[err instanceof Error ? err.message : 'failed'] ?? MESSAGES.failed)
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-white'
  return (
    <div className="grid min-h-screen place-items-center bg-black px-4">
      <form onSubmit={submit} className="grid w-full max-w-sm gap-4 rounded-2xl border border-slate-300 bg-slate-100 p-6">
        <div>
          <h1 className="text-2xl">Вход для сотрудников</h1>
          <p className="mt-1 text-sm text-slate-600">Заявки и отзывы доступны менеджерам и администраторам.</p>
        </div>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Логин или почта
          <input type="text" required autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          Пароль
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-50">
          {busy ? 'Входим…' : 'Войти'}
        </button>
        <Link to="/" className="text-center text-sm text-slate-500 hover:text-slate-800 hover:underline">
          Вернуться на сайт
        </Link>
      </form>
    </div>
  )
}
