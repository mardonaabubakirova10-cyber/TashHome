import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DISTRICTS, type Property } from '../data/properties'
import { useCurrency } from '../lib/currency'
import Badge from './ui/Badge'
import Card from './ui/Card'

export default function PropertyCard({ item }: { item: Property }) {
  const { t, i18n } = useTranslation()
  const { format } = useCurrency()
  const district = DISTRICTS.find((d) => d.id === item.districtId)
  const districtName = district ? (i18n.language === 'uz' ? district.uz : district.ru) : ''

  return (
    <Link to={`/catalog/${item.id}`} className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500">
    <Card className="overflow-hidden transition-colors group-hover:border-brand-500">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
        <img src={item.photo} alt="" loading="lazy" className="size-full object-cover sepia-[.25] transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute left-3 top-3">
          <Badge tone={item.dealType === 'sale' ? 'brand' : 'warning'}>{t(`deal.${item.dealType}`)}</Badge>
        </div>
      </div>
      <div className="grid gap-1 p-4">
        <p className="font-display text-2xl font-semibold">
          {format(item.priceUsd)}
          {item.dealType === 'rent' && <span className="text-sm font-normal text-slate-500"> {t('deal.perMonth')}</span>}
        </p>
        <p className="text-sm text-slate-700">
          {t('card.rooms', { count: item.rooms })} · {item.areaM2} м² · {t('card.land', { count: item.landSotka })} · {t('card.floors', { count: item.floors })}
        </p>
        <p className="text-sm text-slate-500">
          {districtName}, {item.address}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {t(`renovation.${item.renovation}`)} · {t(`building.${item.buildingType}`)}
        </p>
      </div>
    </Card>
    </Link>
  )
}
