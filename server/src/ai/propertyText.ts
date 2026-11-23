export type PropertyRow = {
  id: number
  deal_type: 'sale' | 'rent'
  title_ru: string
  description_ru: string | null
  address: string | null
  price_usd: number | string
  area_m2: number | string
  land_sotka: number | string
  rooms: number
  floors: number
  building_type: 'brick' | 'block' | 'monolith'
  renovation: 'none' | 'basic' | 'euro' | 'designer'
  year_built: number | null
  districts?: { name_ru: string } | null
}

const BUILDING = { brick: 'кирпичный', block: 'блочный', monolith: 'монолитный' } as const
const RENOVATION = { none: 'без ремонта', basic: 'косметический ремонт', euro: 'евроремонт', designer: 'дизайнерский ремонт' } as const

/** Текст дома для эмбеддинга: описание и все признаки, по которым люди формулируют запросы. */
export function propertySearchText(p: PropertyRow): string {
  return [
    p.title_ru,
    p.description_ru ?? '',
    `${p.deal_type === 'sale' ? 'Продажа' : 'Аренда'}, район ${p.districts?.name_ru ?? ''}, ${p.address ?? ''}.`,
    `${p.rooms} комн., ${Number(p.area_m2)} м², участок ${Number(p.land_sotka)} соток, ${p.floors} эт., ${BUILDING[p.building_type]} дом, ${RENOVATION[p.renovation]}, ${p.year_built ?? ''} год.`,
    `Цена ${Number(p.price_usd)} USD${p.deal_type === 'rent' ? ' в месяц' : ''}.`,
  ]
    .filter(Boolean)
    .join(' ')
}
