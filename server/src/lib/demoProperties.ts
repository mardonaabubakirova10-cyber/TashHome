/**
 * Демо-каталог: единый источник и для SQL-сида (scripts/gen-seed.ts), и для хранилища в памяти (тесты, запуск без базы).
 * Генератор детерминированный: при каждом запуске получается один и тот же набор.
 */
export type DealType = 'sale' | 'rent'
export type Renovation = 'none' | 'basic' | 'euro' | 'designer'
export type BuildingType = 'brick' | 'block' | 'monolith'

export type Property = {
  id: number
  dealType: DealType
  titleRu: string
  titleUz: string
  descriptionRu: string
  descriptionUz: string
  districtId: string
  address: string
  /** USD: полная цена для продажи, в месяц для аренды */
  priceUsd: number
  areaM2: number
  landSotka: number
  rooms: number
  floors: number
  buildingType: BuildingType
  renovation: Renovation
  yearBuilt: number
  lat: number
  lng: number
  photo: string
  photos: string[]
  /** Оценка модели и метка «ниже / по / выше рынка»; считает scripts/score-properties.ts */
  predictedPriceUsd: number | null
  priceLabel: 'below' | 'fair' | 'above' | null
}

export type DistrictDemo = { id: string; ru: string; uz: string; ppm2: number; land: number; lat: number; lng: number }

export const DEMO_DISTRICTS: DistrictDemo[] = [
  { id: 'yunusabad', ru: 'Юнусабад', uz: 'Yunusobod', ppm2: 750, land: 9000, lat: 41.365, lng: 69.285 },
  { id: 'mirzo-ulugbek', ru: 'Мирзо-Улугбек', uz: 'Mirzo Ulug‘bek', ppm2: 700, land: 8000, lat: 41.34, lng: 69.335 },
  { id: 'chilanzar', ru: 'Чиланзар', uz: 'Chilonzor', ppm2: 600, land: 6500, lat: 41.275, lng: 69.205 },
  { id: 'shaykhantakhur', ru: 'Шайхантахур', uz: 'Shayxontohur', ppm2: 620, land: 7000, lat: 41.33, lng: 69.23 },
  { id: 'yakkasaray', ru: 'Яккасарай', uz: 'Yakkasaroy', ppm2: 800, land: 10000, lat: 41.295, lng: 69.265 },
  { id: 'mirabad', ru: 'Мирабад', uz: 'Mirobod', ppm2: 850, land: 11000, lat: 41.3, lng: 69.29 },
  { id: 'sergeli', ru: 'Сергели', uz: 'Sergeli', ppm2: 450, land: 4000, lat: 41.225, lng: 69.22 },
  { id: 'yashnabad', ru: 'Яшнабад', uz: 'Yashnobod', ppm2: 560, land: 5500, lat: 41.295, lng: 69.34 },
  { id: 'almazar', ru: 'Алмазар', uz: 'Olmazor', ppm2: 540, land: 5500, lat: 41.35, lng: 69.24 },
  { id: 'uchtepa', ru: 'Учтепа', uz: 'Uchtepa', ppm2: 500, land: 5000, lat: 41.3, lng: 69.17 },
  { id: 'bektemir', ru: 'Бектемир', uz: 'Bektemir', ppm2: 420, land: 3500, lat: 41.215, lng: 69.335 },
  { id: 'yangihayot', ru: 'Янгихаёт', uz: 'Yangihayot', ppm2: 400, land: 3200, lat: 41.34, lng: 69.13 },
]

/** Файлы лежат в web/public/houses и отдаются сайтом по пути /houses/… */
const PHOTO_FILES = [1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28].map(
  (n) => `/houses/house-${String(n).padStart(2, '0')}.jpg`,
)

const STREETS = ['ул. Навруз', 'ул. Сарыкуль', 'ул. Кичик Халка Йули', 'ул. Фергана Йули', 'ул. Беруни', 'ул. Кукча', 'ул. Минор', 'ул. Янги Узбекистан']
const RENOVATION_FACTOR: Record<Renovation, number> = { none: 0.8, basic: 0.93, euro: 1.08, designer: 1.25 }
const RENOVATIONS: Renovation[] = ['none', 'basic', 'euro', 'euro', 'designer']
const BUILDINGS: BuildingType[] = ['brick', 'brick', 'block', 'monolith']

const RENOVATION_RU: Record<Renovation, string> = { none: 'без ремонта', basic: 'с косметическим ремонтом', euro: 'с евроремонтом', designer: 'с дизайнерским ремонтом' }
const RENOVATION_UZ: Record<Renovation, string> = { none: 'ta’mirsiz', basic: 'kosmetik ta’mirli', euro: 'evro ta’mirli', designer: 'dizayner ta’mirli' }
const BUILDING_RU: Record<BuildingType, string> = { brick: 'кирпичный', block: 'блочный', monolith: 'монолитный' }
const BUILDING_UZ: Record<BuildingType, string> = { brick: 'g‘ishtli', block: 'blokli', monolith: 'monolit' }

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function buildDemoProperties(count = 100): Property[] {
  const rnd = mulberry32(42)
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]
  const items: Property[] = []
  for (let i = 1; i <= count; i++) {
    const d = DEMO_DISTRICTS[(i * 5 + Math.floor(i / 12)) % DEMO_DISTRICTS.length]
    const rooms = 3 + Math.floor(rnd() * 5) // 3–7
    const areaM2 = Math.round(rooms * 22 + 20 + rnd() * 40)
    const floors = rooms >= 6 ? pick([2, 2, 3]) : pick([1, 1, 2])
    const landSotka = Math.round((3 + rnd() * 9) * 2) / 2
    const renovation = pick(RENOVATIONS)
    const buildingType = pick(BUILDINGS)
    const noise = 0.88 + rnd() * 0.26
    const sale = Math.round((areaM2 * d.ppm2 * RENOVATION_FACTOR[renovation] + landSotka * d.land) * noise / 500) * 500
    const dealType: DealType = i % 5 === 0 ? 'rent' : 'sale'
    const photos = [0, 1, 2, 3].map((k) => PHOTO_FILES[(i * 7 + k * 11) % PHOTO_FILES.length])
    const street = pick(STREETS)
    items.push({
      id: i,
      dealType,
      titleRu: `${dealType === 'sale' ? 'Дом' : 'Дом в аренду'}, ${rooms} комн., ${areaM2} м², ${d.ru}`,
      titleUz: `${rooms} xonali uy, ${areaM2} m², ${d.uz}${dealType === 'rent' ? ' (ijara)' : ''}`,
      descriptionRu: `${BUILDING_RU[buildingType][0].toUpperCase()}${BUILDING_RU[buildingType].slice(1)} дом ${RENOVATION_RU[renovation]}: ${floors} эт., ${rooms} комнат, участок ${landSotka} соток. Район ${d.ru}.`,
      descriptionUz: `${BUILDING_UZ[buildingType][0].toUpperCase()}${BUILDING_UZ[buildingType].slice(1)} uy, ${RENOVATION_UZ[renovation]}: ${floors} qavat, ${rooms} xona, yer ${landSotka} sotix. ${d.uz} tumani.`,
      districtId: d.id,
      address: `${street}, ${1 + Math.floor(rnd() * 90)}`,
      priceUsd: dealType === 'sale' ? sale : Math.round((sale * 0.005) / 10) * 10,
      areaM2,
      landSotka,
      rooms,
      floors,
      buildingType,
      renovation,
      yearBuilt: 1990 + Math.floor(rnd() * 35),
      lat: Math.round((d.lat + (rnd() - 0.5) * 0.02) * 1e6) / 1e6,
      lng: Math.round((d.lng + (rnd() - 0.5) * 0.02) * 1e6) / 1e6,
      photo: photos[0],
      photos,
      predictedPriceUsd: null,
      priceLabel: null,
    })
  }
  return items
}
