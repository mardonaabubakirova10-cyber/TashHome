import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DISTRICTS, type Property } from '../data/properties'
import { useCurrency } from '../lib/currency'
import ParallaxTicket from './ParallaxTicket'
import Badge from './ui/Badge'

/** Карточка дома для каталога: спереди фото и цена, на обороте характеристики и переход на страницу дома. */
export default function HouseTicket({ item }: { item: Property }) {
  const { t, i18n } = useTranslation()
  const { format } = useCurrency()
  const district = DISTRICTS.find((d) => d.id === item.districtId)
  const districtName = district ? (i18n.language === 'uz' ? district.uz : district.ru) : ''
  const title = t('property.title', { rooms: item.rooms, district: districtName })
  const price = (
    <>
      {format(item.priceUsd)}
      {item.dealType === 'rent' && <span className="text-base font-normal opacity-80"> {t('deal.perMonth')}</span>}
    </>
  )

  const specs: Array<[string, string]> = [
    [t('property.area'), `${item.areaM2} м²`],
    [t('property.land'), t('card.land', { count: item.landSotka })],
    [t('property.rooms'), String(item.rooms)],
    [t('property.floors'), String(item.floors)],
    [t('property.material'), t(`building.${item.buildingType}`)],
    [t('property.renovation'), t(`renovation.${item.renovation}`)],
    [t('property.year'), String(item.yearBuilt)],
  ]

  return (
    <ParallaxTicket
      image={item.photo}
      label={`${title}. ${t('ticket.flip')}`}
      front={
        <>
          <div className="absolute left-5 top-5">
            <Badge tone={item.dealType === 'sale' ? 'brand' : 'warning'}>{t(`deal.${item.dealType}`)}</Badge>
          </div>
          <div className="absolute inset-x-5 bottom-5 text-white">
            <p className="font-display text-4xl font-semibold leading-none">{price}</p>
            <p className="mt-3 text-sm text-white/90">
              {t('card.rooms', { count: item.rooms })} · {item.areaM2} м² · {t('card.land', { count: item.landSotka })}
            </p>
            <p className="mt-1 text-sm text-white/70">{districtName}</p>
          </div>
        </>
      }
      back={(flip) => (
        <div className="flex h-full flex-col gap-3 overflow-y-auto p-5 text-slate-900">
          <div>
            <p className="font-display text-3xl font-semibold leading-none">{price}</p>
            <p className="mt-2 text-sm text-slate-500">
              {districtName}, {item.address}
            </p>
          </div>
          <dl className="divide-y divide-slate-200 text-sm">
            {specs.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-1.5">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto grid gap-2">
            <Link
              to={`/catalog/${item.id}`}
              className="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
            >
              {t('ticket.open')}
            </Link>
            <button type="button" onClick={flip} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-200">
              {t('ticket.flipBack')}
            </button>
          </div>
        </div>
      )}
    />
  )
}
