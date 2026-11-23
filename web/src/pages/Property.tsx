import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ItemActions from '../components/ItemActions'
import LeadForm from '../components/LeadForm'
import MortgageMini from '../components/MortgageMini'
import PhotoGallery from '../components/PhotoGallery'
import PropertyMap from '../components/PropertyMap'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import { DISTRICTS, PROPERTIES } from '../data/properties'
import { useCurrency } from '../lib/currency'
import { LabelBadge } from '../components/PriceLabelBadge'
import { propertyEstimate } from '../lib/priceLabel'

export default function Property() {
  const { id } = useParams()
  const { t, i18n } = useTranslation()
  const { format } = useCurrency()
  const [open, setOpen] = useState(false)

  const item = PROPERTIES.find((p) => String(p.id) === id)
  if (!item) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-bold">{t('property.notFound')}</h1>
        <Link to="/catalog" className="mt-4 inline-block text-brand-100 hover:underline">
          {t('property.back')}
        </Link>
      </div>
    )
  }

  const est = propertyEstimate(item)
  const district = DISTRICTS.find((d) => d.id === item.districtId)
  const districtName = district ? (i18n.language === 'uz' ? district.uz : district.ru) : ''

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
    <div className="grid gap-6">
      <Link to="/catalog" className="text-sm text-brand-100 hover:underline">
        {t('property.back')}
      </Link>

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="grid content-start gap-6">
          <PhotoGallery photos={item.photos} />

          <section>
            <h2 className="mb-3 text-xl font-bold">{t('property.specs')}</h2>
            <Card>
              <dl className="divide-y divide-slate-200">
                {specs.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-5 py-3 text-sm">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-medium text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </section>

          <section>
            <h2 className="mb-1 text-xl font-bold">{t('property.map')}</h2>
            <p className="mb-3 text-sm text-slate-500">
              {districtName}, {item.address}
            </p>
            <PropertyMap lat={item.lat} lng={item.lng} />
          </section>
        </div>

        <aside className="grid content-start gap-4 lg:sticky lg:top-24">
          <Card className="grid gap-3 p-5">
            <div className="flex items-center justify-between">
              <Badge tone={item.dealType === 'sale' ? 'brand' : 'warning'}>{t(`deal.${item.dealType}`)}</Badge>
              <ItemActions id={item.id} />
            </div>
            <h1 className="text-xl font-bold">{t('property.title', { rooms: item.rooms, district: districtName })}</h1>
            <p className="font-display text-4xl font-semibold">
              {format(item.priceUsd)}
              {item.dealType === 'rent' && <span className="text-base font-normal text-slate-500"> {t('deal.perMonth')}</span>}
            </p>
            {est && (
              <div className="rounded-lg bg-slate-100 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <LabelBadge label={est.label} />
                  <span className="text-slate-600">{t('priceLabel.model')}: <b>{format(est.predicted)}</b></span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{t('priceLabel.hint')}</p>
              </div>
            )}
            <Button size="lg" onClick={() => setOpen(true)}>
              {t('property.book')}
            </Button>
          </Card>

          {item.dealType === 'sale' && <MortgageMini priceUsd={item.priceUsd} />}
        </aside>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={t('property.bookTitle')}>
        <LeadForm propertyId={item.id} onDone={() => setOpen(false)} />
      </Modal>
    </div>
  )
}
