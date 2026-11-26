import { useEffect } from 'react'
import { Link, NavLink, Navigate, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AdminApiError, useAuth, type Role } from '../../lib/auth'

export type Me = { id: string; email: string | null; role: Role }

const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm transition-colors ${isActive ? 'bg-white text-black' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'}`

/** Оболочка админки: проверяет вход и роль, показывает меню. Служебные страницы только на русском. */
export default function AdminLayout() {
  const { loggedIn, email, logout, api } = useAuth()
  const me = useQuery({ queryKey: ['admin-me'], queryFn: () => api<Me>('/admin/me'), enabled: loggedIn, retry: false, staleTime: 5 * 60_000 })

  useEffect(() => {
    const before = document.title
    document.title = 'TashHome — служебный раздел'
    return () => {
      document.title = before // при возврате на сайт вкладка получает прежнее название
    }
  }, [])

  if (!loggedIn) return <Navigate to="/admin/login" replace />
  if (me.isPending) return <p className="p-8 text-slate-600">Проверяю доступ…</p>
  if (me.isError) {
    const forbidden = me.error instanceof AdminApiError && me.error.status === 403
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl">{forbidden ? 'Нет доступа' : 'Не удалось проверить доступ'}</h1>
        <p className="mt-2 text-slate-600">{forbidden ? 'У вашей учётной записи нет прав сотрудника. Администратор может выдать роль.' : 'Проверьте, что сервер запущен, и попробуйте ещё раз.'}</p>
        <button type="button" onClick={logout} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-200">
          Выйти
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-slate-900">
      <header className="border-b border-slate-200 bg-slate-100">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-8">
          <Link to="/admin" className="font-display text-xl text-slate-900">
            TashHome <span className="text-sm text-slate-500">служебный раздел</span>
          </Link>
          <nav className="flex gap-1" aria-label="Разделы">
            <NavLink to="/admin" end className={link}>
              Обзор
            </NavLink>
            <NavLink to="/admin/leads" className={link}>
              Заявки
            </NavLink>
            <NavLink to="/admin/properties" className={link}>
              Дома
            </NavLink>
            <NavLink to="/admin/reviews" className={link}>
              Отзывы
            </NavLink>
            <NavLink to="/admin/texts" className={link}>
              Тексты
            </NavLink>
            {me.data.role === 'admin' && (
              <NavLink to="/admin/kb" className={link}>
                База знаний
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
            <span className="hidden sm:inline">
              {email} · {me.data.role === 'admin' ? 'администратор' : 'менеджер'}
            </span>
            <Link to="/" className="hover:text-slate-900 hover:underline">
              На сайт
            </Link>
            <button type="button" onClick={logout} className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-200">
              Выйти
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8">
        <Outlet />
      </main>
    </div>
  )
}
