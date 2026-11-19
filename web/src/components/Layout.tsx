import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCurrency, type Currency } from '../lib/currency'

const links = [
  { to: '/catalog', key: 'catalog' },
  { to: '/estimate', key: 'estimate' },
  { to: '/mortgage', key: 'mortgage' },
  { to: '/favorites', key: 'favorites' },
  { to: '/assistant', key: 'assistant' },
] as const

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: readonly T[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={`rounded-md px-2.5 py-1 transition-colors ${
            value === o ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {o.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

export default function Layout() {
  const { t, i18n } = useTranslation()
  const { currency, setCurrency } = useCurrency()

  const setLang = (l: 'ru' | 'uz') => {
    i18n.changeLanguage(l)
    try {
      localStorage.setItem('lang', l)
    } catch {
      /* localStorage недоступен */
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <NavLink to="/" className="text-lg font-bold text-brand-600">
            Uy AI
          </NavLink>
          <nav className="order-3 flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto sm:flex-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-md px-3 py-1.5 ${
                    isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {t(`nav.${l.key}`)}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex gap-2 sm:ml-0">
            <Segmented<'ru' | 'uz'>
              label="Language"
              value={i18n.language === 'uz' ? 'uz' : 'ru'}
              options={['ru', 'uz'] as const}
              onChange={setLang}
            />
            <Segmented<Currency>
              label="Currency"
              value={currency}
              options={['USD', 'UZS'] as const}
              onChange={setCurrency}
            />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-sm text-slate-500">{t('footer')}</footer>
    </div>
  )
}
