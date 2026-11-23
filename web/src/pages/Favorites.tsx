import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import HouseTicket from '../components/HouseTicket'
import { useCollections } from '../lib/collections'
import { useProperties } from '../lib/queries'

export default function Favorites() {
  const { t } = useTranslation()
  const { favorites } = useCollections()
  const { items, loading } = useProperties(favorites)

  return (
    <div className="grid gap-6">
      <h1 className="text-3xl sm:text-4xl">{t('pages.favorites')}</h1>

      {loading && favorites.length > 0 ? (
        <p className="text-slate-600">{t('catalog.loading')}</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <p className="font-medium">{t('favorites.empty')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('favorites.emptyHint')}</p>
          <Link to="/catalog" className="mt-4 inline-block text-brand-100 hover:underline">
            {t('favorites.toCatalog')} →
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <HouseTicket key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
