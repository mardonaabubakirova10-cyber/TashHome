import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth'

const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

/** Вход клиента через аккаунт Google. Сотрудники входят почтой и паролем на /admin/login. */
export default function Login() {
  const { t } = useTranslation()
  const { loggedIn, loginWithGoogle } = useAuth()
  if (loggedIn) return <Navigate to="/account" replace />

  return (
    <div className="mx-auto grid max-w-md gap-6 py-10">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl">{t('account.loginTitle')}</h1>
        <p className="mt-2 text-slate-600">{t('account.loginText')}</p>
      </div>
      <button
        type="button"
        onClick={loginWithGoogle}
        disabled={!configured}
        className="flex items-center justify-center gap-3 rounded-xl bg-white px-5 py-3 text-base font-medium text-black transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40"
      >
        <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
          <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 12-2.1 16-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        {t('account.google')}
      </button>
      {!configured && <p className="text-center text-sm text-red-400">{t('account.notConfigured')}</p>}
      <p className="text-center text-sm text-slate-500">
        {t('account.staff')}{' '}
        <Link to="/admin/login" className="underline-offset-2 hover:text-slate-800 hover:underline">
          {t('account.staffLink')}
        </Link>
      </p>
    </div>
  )
}
