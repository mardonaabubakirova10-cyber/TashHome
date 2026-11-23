// Демо-данные. После подключения Supabase (этап 1) каталог будет читать их из базы.

export type DealType = 'sale' | 'rent'
export type Renovation = 'none' | 'basic' | 'euro' | 'designer'
export type BuildingType = 'brick' | 'block' | 'monolith'

/** ppm2 — ориентировочная цена за м² дома, landPrice — за сотку земли, оба в USD */
export type District = { id: string; ru: string; uz: string; ppm2: number; landPrice: number }

export type Property = {
  id: number
  dealType: DealType
  districtId: string
  address: string
  /** Цена в USD: полная для продажи, в месяц для аренды */
  priceUsd: number
  /** Площадь дома, м² */
  areaM2: number
  /** Площадь участка, соток */
  landSotka: number
  rooms: number
  /** Этажей в доме */
  floors: number
  buildingType: BuildingType
  renovation: Renovation
  yearBuilt: number
  lat: number
  lng: number
  photo: string
  photos: string[]
}

// Центры районов Ташкента (приблизительно), для карты
const COORDS: Record<string, [number, number]> = {
  yunusabad: [41.365, 69.285],
  'mirzo-ulugbek': [41.34, 69.335],
  chilanzar: [41.275, 69.205],
  shaykhantakhur: [41.33, 69.23],
  yakkasaray: [41.295, 69.265],
  mirabad: [41.3, 69.29],
  sergeli: [41.225, 69.22],
  yashnabad: [41.295, 69.34],
  almazar: [41.35, 69.24],
  uchtepa: [41.3, 69.17],
  bektemir: [41.215, 69.335],
  yangihayot: [41.34, 69.13],
}

export const DISTRICTS: District[] = [
  { id: 'yunusabad', ru: 'Юнусабад', uz: 'Yunusobod', ppm2: 750, landPrice: 9000 },
  { id: 'mirzo-ulugbek', ru: 'Мирзо-Улугбек', uz: 'Mirzo Ulug‘bek', ppm2: 700, landPrice: 8000 },
  { id: 'chilanzar', ru: 'Чиланзар', uz: 'Chilonzor', ppm2: 600, landPrice: 6500 },
  { id: 'shaykhantakhur', ru: 'Шайхантахур', uz: 'Shayxontohur', ppm2: 620, landPrice: 7000 },
  { id: 'yakkasaray', ru: 'Яккасарай', uz: 'Yakkasaroy', ppm2: 800, landPrice: 10000 },
  { id: 'mirabad', ru: 'Мирабад', uz: 'Mirobod', ppm2: 850, landPrice: 11000 },
  { id: 'sergeli', ru: 'Сергели', uz: 'Sergeli', ppm2: 450, landPrice: 4000 },
  { id: 'yashnabad', ru: 'Яшнабад', uz: 'Yashnobod', ppm2: 560, landPrice: 5500 },
  { id: 'almazar', ru: 'Алмазар', uz: 'Olmazor', ppm2: 540, landPrice: 5500 },
  { id: 'uchtepa', ru: 'Учтепа', uz: 'Uchtepa', ppm2: 500, landPrice: 5000 },
  { id: 'bektemir', ru: 'Бектемир', uz: 'Bektemir', ppm2: 420, landPrice: 3500 },
  { id: 'yangihayot', ru: 'Янгихаёт', uz: 'Yangihayot', ppm2: 400, landPrice: 3200 },
]

// Настоящие фото домов лежат в src/assets/houses. Пока папка пуста, подставляются случайные картинки-заглушки.
const LOCAL_PHOTOS = Object.values(
  import.meta.glob('../assets/houses/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' }),
) as string[]

// Шаг, взаимно простой с числом фото: так соседние карточки получают далёкие друг от друга снимки, а повторов нет, пока фото хватает
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
const PHOTO_STEP = (() => {
  const n = LOCAL_PHOTOS.length
  let step = Math.max(1, Math.round(n / 3))
  while (n > 1 && gcd(step, n) !== 1) step++
  return step
})()
const localPhoto = (index: number) => LOCAL_PHOTOS[(index * PHOTO_STEP) % LOCAL_PHOTOS.length]

const STREETS = ['ул. Навруз', 'ул. Сарыкуль', 'ул. Кичик Халка Йули', 'ул. Фергана Йули', 'ул. Беруни', 'ул. Кукча', 'ул. Минор', 'ул. Янги Узбекистан']
const RENOVATION_FACTOR: Record<Renovation, number> = { none: 0.8, basic: 0.93, euro: 1.08, designer: 1.25 }
const RENOVATIONS: Renovation[] = ['none', 'basic', 'euro', 'euro', 'designer']
const BUILDINGS: BuildingType[] = ['brick', 'brick', 'block', 'monolith']

// Детерминированный генератор, чтобы демо-данные были одинаковыми при каждом запуске
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function build(): Property[] {
  const rnd = mulberry32(42)
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]
  const items: Property[] = []
  for (let i = 1; i <= 36; i++) {
    const district = DISTRICTS[(i * 5) % DISTRICTS.length]
    const rooms = 3 + Math.floor(rnd() * 5) // 3–7
    const areaM2 = Math.round(rooms * 22 + 20 + rnd() * 40)
    const floors = rooms >= 6 ? pick([2, 2, 3]) : pick([1, 1, 2])
    const landSotka = Math.round((3 + rnd() * 9) * 2) / 2 // 3–12 соток, шаг 0.5
    const renovation = pick(RENOVATIONS)
    const noise = 0.88 + rnd() * 0.26
    const sale =
      Math.round((areaM2 * district.ppm2 * RENOVATION_FACTOR[renovation] + landSotka * district.landPrice) * noise / 500) * 500
    const dealType: DealType = i % 5 === 0 ? 'rent' : 'sale'
    items.push({
      id: i,
      dealType,
      districtId: district.id,
      address: `${pick(STREETS)}, ${1 + Math.floor(rnd() * 90)}`,
      priceUsd: dealType === 'sale' ? sale : Math.round((sale * 0.005) / 10) * 10,
      areaM2,
      landSotka,
      rooms,
      floors,
      buildingType: pick(BUILDINGS),
      renovation,
      yearBuilt: 1990 + Math.floor(rnd() * 35),
      lat: COORDS[district.id][0] + (rnd() - 0.5) * 0.02,
      lng: COORDS[district.id][1] + (rnd() - 0.5) * 0.02,
      photo: LOCAL_PHOTOS.length ? localPhoto(i - 1) : `https://picsum.photos/seed/uyai${i}/800/600`,
      photos: [0, 1, 2, 3].map((k) =>
        LOCAL_PHOTOS.length ? localPhoto(i - 1 + k * 7) : `https://picsum.photos/seed/uyai${i}-${k}/800/600`,
      ),
    })
  }
  return items
}

export const PROPERTIES: Property[] = build()
