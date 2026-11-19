import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCollections } from '../lib/collections'
import { useCurrency, type Currency } from '../lib/currency'

const links = [
  { to: '/', key: 'home' },
  { to: '/catalog', key: 'catalog' },
  { to: '/estimate', key: 'estimate' },
  { to: '/mortgage', key: 'mortgage' },
  { to: '/favorites', key: 'favorites' },
  { to: '/compare', key: 'compare' },
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
    <div role="group" aria-label={label} className="flex rounded-lg border border-white/20 p-0.5 text-xs font-medium">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={value === o}
          onClick={() => onChange(o)}
          className={`rounded-md px-2.5 py-1 transition-colors ${
            value === o ? 'bg-brand-500 text-white' : 'text-white/70 hover:bg-white/10'
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
  const { favorites, compare } = useCollections()
  const counts: Record<string, number> = { favorites: favorites.length, compare: compare.length }

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
      <header className="sticky top-0 z-10 border-b border-white/10 bg-ink/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <NavLink to="/" className="font-display text-2xl font-semibold tracking-tight">
            TashHome
          </NavLink>
          <nav className="order-3 flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto sm:flex-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-md px-3 py-1.5 ${
                    isActive ? 'bg-white/10 font-medium text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {t(`nav.${l.key}`)}
                {counts[l.key] > 0 && (
                  <span className="ml-1.5 rounded-full bg-brand-500 px-1.5 py-0.5 text-[11px] leading-none text-white">{counts[l.key]}</span>
                )}
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
      <footer className="bg-ink py-8 text-center text-sm text-white/60">
        <p className="font-display text-xl text-white">TashHome</p>
        <p className="mt-1">{t('footer')}</p>
      </footer>
    </div>
  )
}
