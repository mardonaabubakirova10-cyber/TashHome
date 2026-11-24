import { z } from 'zod'
import { DISTRICT_IDS } from '../ai/tools.js'
import type { Property } from './demoProperties.js'

/** Дом в виде, удобном для формы админки: названия колонок как в базе, фото списком адресов. */
export type AdminProperty = {
  id: number
  deal_type: 'sale' | 'rent'
  title_ru: string
  title_uz: string
  description_ru: string | null
  description_uz: string | null
  district_id: string
  address: string | null
  lat: number | null
  lng: number | null
  price_usd: number
  area_m2: number
  land_sotka: number
  rooms: number
  floors: number
  building_type: 'brick' | 'block' | 'monolith'
  renovation: 'none' | 'basic' | 'euro' | 'designer'
  year_built: number | null
  status: 'active' | 'sold' | 'hidden'
  predicted_price_usd: number | null
  price_label: 'below' | 'fair' | 'above' | null
  photos: string[]
}

// Фото: свои (папка сайта) или загруженные в хранилище по https. Любые другие схемы (javascript:, data:) запрещены.
const photoUrl = z
  .string()
  .max(500)
  .refine((u) => /^\/houses\/[\w./-]+$/.test(u) || /^https:\/\/[^\s"'<>]+$/.test(u), 'Адрес фото должен начинаться с /houses/ или https://')

const text = (max: number) => z.string().trim().max(max)

const propertyBase = z.object({
  deal_type: z.enum(['sale', 'rent']),
  title_ru: text(200).min(3, 'Введите название'),
  title_uz: text(200).min(3, 'Введите название на узбекском'),
  description_ru: text(3000).nullish().transform((v) => v || null),
  description_uz: text(3000).nullish().transform((v) => v || null),
  district_id: z.enum(DISTRICT_IDS),
  address: text(200).nullish().transform((v) => v || null),
  lat: z.number().min(40).max(43).nullish().transform((v) => v ?? null),
  lng: z.number().min(68).max(71).nullish().transform((v) => v ?? null),
  price_usd: z.number().positive().max(100_000_000),
  area_m2: z.number().min(20).max(2000),
  land_sotka: z.number().min(0).max(500),
  rooms: z.number().int().min(1).max(20),
  floors: z.number().int().min(1).max(10),
  building_type: z.enum(['brick', 'block', 'monolith']),
  renovation: z.enum(['none', 'basic', 'euro', 'designer']),
  year_built: z.number().int().min(1800).max(2100).nullish().transform((v) => v ?? null),
  status: z.enum(['active', 'sold', 'hidden']),
  photos: z.array(photoUrl).max(12),
})

/** Создание: статус и фото необязательны, подставляются значения по умолчанию. */
export const propertyInput = propertyBase.extend({
  status: propertyBase.shape.status.default('active'),
  photos: propertyBase.shape.photos.default([]),
})
export type PropertyInput = z.infer<typeof propertyInput>

/** Правка: только присланные поля. Значений по умолчанию здесь нет, иначе правка цены сбросила бы статус и фото. */
export const propertyPatch = propertyBase.partial()
export type PropertyPatch = z.infer<typeof propertyPatch>

export type PropertyListFilter = { q?: string; status?: AdminProperty['status']; deal?: AdminProperty['deal_type']; page: number; pageSize: number }

/** Для хранилища в памяти: демо-дом → вид админки. */
export function toAdminProperty(p: Property): AdminProperty {
  return {
    id: p.id,
    deal_type: p.dealType,
    title_ru: p.titleRu,
    title_uz: p.titleUz,
    description_ru: p.descriptionRu || null,
    description_uz: p.descriptionUz || null,
    district_id: p.districtId,
    address: p.address || null,
    lat: p.lat,
    lng: p.lng,
    price_usd: p.priceUsd,
    area_m2: p.areaM2,
    land_sotka: p.landSotka,
    rooms: p.rooms,
    floors: p.floors,
    building_type: p.buildingType,
    renovation: p.renovation,
    year_built: p.yearBuilt,
    status: 'active',
    predicted_price_usd: p.predictedPriceUsd,
    price_label: p.priceLabel,
    photos: p.photos,
  }
}

/** Метка: цена ниже оценки больше чем на 10 % — below, выше больше чем на 10 % — above, иначе fair. */
export function labelFor(price: number, predicted: number): 'below' | 'fair' | 'above' {
  const dev = (price - predicted) / predicted
  return dev < -0.1 ? 'below' : dev > 0.1 ? 'above' : 'fair'
}
