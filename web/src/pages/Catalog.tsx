import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import HouseTicket from '../components/HouseTicket'
import Button from '../components/ui/Button'
import { Input, Select } from '../components/ui/Field'
import { DISTRICTS } from '../data/properties'
import { applyFilters, PAGE_SIZE, parseFilters } from '../lib/filters'

export default function Catalog() {
  const { t, i18n } = useTranslation()
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])
  const results = useMemo(() => applyFilters(filters), [filters])

  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const page = Math.min(filters.page, pages)
  const visible = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Любое изменение фильтра сбрасывает страницу на первую
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">{t('pages.catalog')}</h1>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select label={t('deal.sale') + ' / ' + t('deal.rent')} value={filters.deal ?? ''} onChange={(e) => setParam('deal', e.target.value)}>
          <option value="">{t('deal.all')}</option>
          <option value="sale">{t('deal.sale')}</option>
          <option value="rent">{t('deal.rent')}</option>
        </Select>
        <Select label={t('filters.district')} value={filters.district ?? ''} onChange={(e) => setParam('district', e.target.value)}>
          <option value="">{t('filters.anyDistrict')}</option>
          {DISTRICTS.map((d) => (
            <option key={d.id} value={d.id}>
              {i18n.language === 'uz' ? d.uz : d.ru}
            </option>
          ))}
        </Select>
        <Select label={t('filters.rooms')} value={filters.rooms?.toString() ?? ''} onChange={(e) => setParam('rooms', e.target.value)}>
          <option value="">{t('filters.anyRooms')}</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6+</option>
        </Select>
        <Select label={t('filters.sort')} value={filters.sort} onChange={(e) => setParam('sort', e.target.value === 'default' ? '' : e.target.value)}>
          <option value="default">{t('filters.sortNew')}</option>
          <option value="price_asc">{t('filters.sortPriceAsc')}</option>
          <option value="price_desc">{t('filters.sortPriceDesc')}</option>
        </Select>
        <Input label={t('filters.priceFrom')} type="number" min={0} inputMode="numeric" value={filters.priceFrom ?? ''} onChange={(e) => setParam('priceFrom', e.target.value)} />
        <Input label={t('filters.priceTo')} type="number" min={0} inputMode="numeric" value={filters.priceTo ?? ''} onChange={(e) => setParam('priceTo', e.target.value)} />
        <Input label={t('filters.areaFrom')} type="number" min={0} inputMode="numeric" value={filters.areaFrom ?? ''} onChange={(e) => setParam('areaFrom', e.target.value)} />
        <Input label={t('filters.landFrom')} type="number" min={0} inputMode="numeric" value={filters.landFrom ?? ''} onChange={(e) => setParam('landFrom', e.target.value)} />
        <div className="flex items-end">
          <Button variant="secondary" className="w-full" onClick={() => setParams(new URLSearchParams())}>
            {t('filters.reset')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <p>{t('catalog.found', { count: results.length })}</p>
        <p>{t('ticket.hint')}</p>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center">
          <p className="font-medium">{t('catalog.empty')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('catalog.emptyHint')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <HouseTicket key={item.id} item={item} />
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>
            {t('catalog.prev')}
          </Button>
          <span className="text-sm text-slate-600">{t('catalog.page', { page, pages })}</span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setParam('page', String(page + 1))}>
            {t('catalog.next')}
          </Button>
        </div>
      )}
    </div>
  )
}
