import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PropertyCard from '../components/PropertyCard'
import { DISTRICTS, PROPERTIES } from '../data/properties'

const buttonBase = 'inline-flex items-center justify-center rounded-lg px-5 py-3 text-base font-medium transition-colors'

export default function Home() {
  const { t, i18n } = useTranslation()
  const popular = DISTRICTS.slice(0, 6)
  const fresh = PROPERTIES.slice(0, 3)

  return (
    <div className="grid gap-12">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 px-6 py-14 text-center text-white sm:py-20">
        <h1 className="text-3xl font-bold sm:text-5xl">{t('home.title')}</h1>
        <p className="mx-auto mt-4 max-w-xl text-brand-100">{t('home.subtitle')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/catalog" className={`${buttonBase} bg-white text-brand-700 hover:bg-brand-50`}>
            {t('home.toCatalog')}
          </Link>
          <Link to="/assistant" className={`${buttonBase} border border-white/60 text-white hover:bg-white/10`}>
            {t('home.askAssistant')}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">{t('home.districts')}</h2>
        <div className="flex flex-wrap gap-2">
          {popular.map((d) => (
            <Link
              key={d.id}
              to={`/catalog?district=${d.id}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm hover:border-brand-500 hover:text-brand-700"
            >
              {i18n.language === 'uz' ? d.uz : d.ru}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{t('home.fresh')}</h2>
          <Link to="/catalog" className="text-sm font-medium text-brand-600 hover:underline">
            {t('home.all')}
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fresh.map((item) => (
            <PropertyCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  )
}
