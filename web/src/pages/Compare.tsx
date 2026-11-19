import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import { DISTRICTS, PROPERTIES, type Property } from '../data/properties'
import { COMPARE_MAX, useCollections } from '../lib/collections'
import { useCurrency } from '../lib/currency'

export default function Compare() {
  const { t, i18n } = useTranslation()
  const { format } = useCurrency()
  const { compare, toggleCompare, clearCompare } = useCollections()
  const items = compare.map((id) => PROPERTIES.find((p) => p.id === id)).filter((p) => p !== undefined)

  const districtName = (p: Property) => {
    const d = DISTRICTS.find((x) => x.id === p.districtId)
    return d ? (i18n.language === 'uz' ? d.uz : d.ru) : ''
  }

  // Строки таблицы: подпись и значение для каждого дома
  const rows: Array<[string, (p: Property) => string]> = [
    [t('compare.price'), (p) => format(p.priceUsd) + (p.dealType === 'rent' ? ' ' + t('deal.perMonth') : '')],
    [t('compare.pricePerM2'), (p) => (p.dealType === 'sale' ? format(p.priceUsd / p.areaM2) : '—')],
    [t('filters.district'), districtName],
    [t('property.area'), (p) => `${p.areaM2} м²`],
    [t('property.land'), (p) => t('card.land', { count: p.landSotka })],
    [t('property.rooms'), (p) => String(p.rooms)],
    [t('property.floors'), (p) => String(p.floors)],
    [t('property.material'), (p) => t(`building.${p.buildingType}`)],
    [t('property.renovation'), (p) => t(`renovation.${p.renovation}`)],
    [t('property.year'), (p) => String(p.yearBuilt)],
  ]

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-3xl sm:text-4xl">{t('pages.compare')}</h1>
        {items.length > 0 && (
          <Button variant="secondary" size="sm" onClick={clearCompare}>
            {t('compare.clear')}
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <p className="font-medium">{t('compare.empty')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('compare.emptyHint', { max: COMPARE_MAX })}</p>
          <Link to="/catalog" className="mt-4 inline-block text-brand-100 hover:underline">
            {t('favorites.toCatalog')} →
          </Link>
        </div>
      ) : (
        <>
          {items.length === 1 && <p className="text-sm text-slate-500">{t('compare.addMore')}</p>}
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 align-top">
                  <th className="w-40 p-4" />
                  {items.map((p) => (
                    <th key={p.id} className="p-4 text-left font-normal">
                      <img src={p.photo} alt="" className="mb-3 aspect-[4/3] w-full rounded-md object-cover sepia-[.25]" />
                      <Link to={`/catalog/${p.id}`} className="font-medium hover:underline">
                        {t('property.title', { rooms: p.rooms, district: districtName(p) })}
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleCompare(p.id)}
                        className="mt-1 block text-xs text-slate-500 hover:text-slate-900"
                      >
                        {t('compare.remove')}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, get]) => (
                  <tr key={label} className="border-b border-slate-200 last:border-0">
                    <th scope="row" className="p-4 text-left font-normal text-slate-500">
                      {label}
                    </th>
                    {items.map((p) => (
                      <td key={p.id} className="p-4 font-medium">
                        {get(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  )
}
