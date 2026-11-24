import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../lib/auth'
import { useCollections } from '../lib/collections'

type Me = { id: string; email: string | null; role: 'client' | 'manager' | 'admin' }

/** Личный кабинет: данные аккаунта Google, избранное и переход в служебный раздел для сотрудников. */
export default function Account() {
  const { t } = useTranslation()
  const { loggedIn, name, email, avatar, logout, api } = useAuth()
  const { favorites } = useCollections()
  const navigate = useNavigate()
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/me'), enabled: loggedIn, retry: false, staleTime: 60_000 })

  if (!loggedIn) return <Navigate to="/login" replace />
  const staff = me.data?.role === 'manager' || me.data?.role === 'admin'

  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <h1 className="text-3xl sm:text-4xl">{t('account.title')}</h1>
      <section className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-100 p-5">
        {avatar ? (
          <img src={avatar} alt="" referrerPolicy="no-referrer" className="size-16 rounded-full object-cover" />
        ) : (
          <span className="grid size-16 place-items-center rounded-full bg-slate-300 text-2xl text-slate-800" aria-hidden>
            {(name ?? email ?? '?').charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{name ?? email}</p>
          {name && <p className="truncate text-sm text-slate-500">{email}</p>}
          {staff && <p className="mt-1 text-xs text-slate-500">{me.data?.role === 'admin' ? t('account.roleAdmin') : t('account.roleManager')}</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-100 p-5">
        <h2 className="text-base font-semibold">{t('account.favorites')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('account.favoritesText', { count: favorites.length })}</p>
        <Link to="/favorites" className="mt-3 inline-block text-sm text-brand-100 hover:underline">
          {t('account.openFavorites')} →
        </Link>
      </section>

      <div className="flex flex-wrap gap-3">
        {staff && (
          <Link to="/admin" className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-200">
            {t('account.admin')}
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            logout()
            navigate('/')
          }}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-200"
        >
          {t('account.logout')}
        </button>
      </div>
    </div>
  )
}
