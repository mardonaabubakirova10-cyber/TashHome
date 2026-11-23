// Типы каталога и список районов. Сами дома приходят с сервера (lib/api.ts, lib/queries.ts).

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
  titleRu: string
  titleUz: string
  descriptionRu: string
  descriptionUz: string
  /** Оценка модели и метка относительно рынка; у аренды их нет */
  predictedPriceUsd: number | null
  priceLabel: 'below' | 'fair' | 'above' | null
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
