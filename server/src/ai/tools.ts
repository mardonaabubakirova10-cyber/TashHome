import { z } from 'zod'
import type { Property } from '../lib/demoProperties.js'
import { monthlyPayment } from '../lib/mortgage.js'
import type { KbHit, SearchFilters } from '../lib/store.js'
import type { ToolDeclaration } from './gemini.js'

export const DISTRICT_IDS = ['yunusabad', 'mirzo-ulugbek', 'chilanzar', 'shaykhantakhur', 'yakkasaray', 'mirabad', 'sergeli', 'yashnabad', 'almazar', 'uchtepa', 'bektemir', 'yangihayot'] as const
export const KB_MIN_SIMILARITY = 0.65 // ниже этого порога фрагмент считается нерелевантным

const DISTRICT_HINT =
  'yunusabad=Юнусабад, mirzo-ulugbek=Мирзо-Улугбек, chilanzar=Чиланзар, shaykhantakhur=Шайхантахур, yakkasaray=Яккасарай, mirabad=Мирабад, sergeli=Сергели, yashnabad=Яшнабад, almazar=Алмазар, uchtepa=Учтепа, bektemir=Бектемир, yangihayot=Янгихаёт'

/** Описания инструментов для Gemini (SPEC §6.1). */
export const TOOL_DECLARATIONS: ToolDeclaration[] = [
  {
    name: 'search_properties',
    description:
      'Ищет дома в каталоге. Используй для любых запросов на подбор. Структурные условия передавай фильтрами, а «мягкие» пожелания (уютный, тихая улица, с садом) в query. Возвращает до 5 домов; сайт сам покажет их карточками.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Свободное описание пожеланий для смыслового поиска' },
        deal_type: { type: 'string', enum: ['sale', 'rent'], description: 'sale = покупка, rent = аренда' },
        district_id: { type: 'string', enum: [...DISTRICT_IDS], description: `Район. ${DISTRICT_HINT}` },
        min_price: { type: 'number', description: 'Минимальная цена, USD' },
        max_price: { type: 'number', description: 'Максимальная цена, USD (для аренды цена в месяц)' },
        min_rooms: { type: 'integer', description: 'Минимум комнат' },
        min_area: { type: 'number', description: 'Минимальная площадь дома, м²' },
        min_land: { type: 'number', description: 'Минимальная площадь участка, соток' },
      },
    },
  },
  {
    name: 'get_property',
    description: 'Возвращает подробности одного дома по его id (после поиска или если пользователь назвал номер).',
    parameters: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
  },
  {
    name: 'search_knowledge',
    description:
      'Ищет ответ в базе знаний агентства: порядок покупки, документы, налоги, ипотека, аренда, оценка, FAQ. Используй для всех вопросов «как / что нужно / сколько стоит оформление». Если found=false, честно скажи, что не знаешь, и предложи связаться с менеджером.',
    parameters: { type: 'object', properties: { question: { type: 'string' } }, required: ['question'] },
  },
  {
    name: 'calc_mortgage',
    description: 'Считает ипотеку: ежемесячный платёж, сумму кредита, переплату. Если пользователь не назвал параметры, спроси или используй типовые: взнос 30 %, срок 15 лет, ставка 24 %, и скажи, что расчёт ориентировочный.',
    parameters: {
      type: 'object',
      properties: {
        price: { type: 'number', description: 'Цена дома, USD' },
        down_percent: { type: 'number', description: 'Первоначальный взнос, % (0–90)' },
        term_years: { type: 'number', description: 'Срок, лет (1–30)' },
        rate_percent: { type: 'number', description: 'Годовая ставка, %' },
      },
      required: ['price'],
    },
  },
  {
    name: 'estimate_price',
    description: 'Оценивает рыночную стоимость дома по параметрам с помощью ML-модели. Нужны все параметры; недостающие спроси у пользователя.',
    parameters: {
      type: 'object',
      properties: {
        district: { type: 'string', enum: [...DISTRICT_IDS], description: DISTRICT_HINT },
        area_m2: { type: 'number' },
        land_sotka: { type: 'number' },
        rooms: { type: 'integer' },
        floors: { type: 'integer' },
        building_type: { type: 'string', enum: ['brick', 'block', 'monolith'] },
        renovation: { type: 'string', enum: ['none', 'basic', 'euro', 'designer'] },
        year_built: { type: 'integer' },
      },
      required: ['district', 'area_m2', 'land_sotka', 'rooms', 'floors', 'building_type', 'renovation', 'year_built'],
    },
  },
  {
    name: 'create_lead',
    description:
      'Создаёт заявку для менеджера. Вызывай ТОЛЬКО когда пользователь явно согласился оставить заявку и назвал имя и телефон +998XXXXXXXXX. Перед вызовом повтори данные и спроси подтверждение; confirmed=true ставь только после ответа «да».',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        phone: { type: 'string', description: 'Формат +998XXXXXXXXX' },
        property_id: { type: 'integer', description: 'id дома, если заявка по конкретному дому' },
        message: { type: 'string', description: 'Пожелания клиента кратко' },
        confirmed: { type: 'boolean', description: 'true только после явного согласия пользователя' },
      },
      required: ['name', 'phone', 'confirmed'],
    },
  },
]

// ---- проверка аргументов, которые прислала модель: модели доверять нельзя ----
const optNum = z.number().finite().optional()
export const searchArgs = z.object({
  query: z.string().max(500).optional(),
  deal_type: z.enum(['sale', 'rent']).optional(),
  district_id: z.enum(DISTRICT_IDS).optional(),
  min_price: optNum,
  max_price: optNum,
  min_rooms: z.number().int().optional(),
  min_area: optNum,
  min_land: optNum,
})
export const mortgageArgs = z.object({
  price: z.number().positive().max(10_000_000_000),
  down_percent: z.number().min(0).max(90).default(30),
  term_years: z.number().min(1).max(30).default(15),
  rate_percent: z.number().min(0).max(60).default(24),
})
export const estimateArgs = z.object({
  district: z.enum(DISTRICT_IDS),
  area_m2: z.number().gt(20).max(2000),
  land_sotka: z.number().gt(0).max(500),
  rooms: z.number().int().min(1).max(20),
  floors: z.number().int().min(1).max(5),
  building_type: z.enum(['brick', 'block', 'monolith']),
  renovation: z.enum(['none', 'basic', 'euro', 'designer']),
  year_built: z.number().int().min(1900).max(2026),
})
export const leadArgs = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().transform((v) => v.replace(/[\s()-]/g, '')).pipe(z.string().regex(/^\+998\d{9}$/, 'Телефон должен быть в формате +998XXXXXXXXX')),
  property_id: z.number().int().positive().optional(),
  message: z.string().trim().max(1000).optional(),
  confirmed: z.boolean(),
})

/** Компактное представление дома для модели: только то, что нужно для ответа. */
export function propertyForModel(p: Property) {
  return {
    id: p.id,
    deal_type: p.dealType,
    district_id: p.districtId,
    title: p.titleRu,
    price_usd: p.priceUsd,
    rooms: p.rooms,
    area_m2: p.areaM2,
    land_sotka: p.landSotka,
    floors: p.floors,
    building_type: p.buildingType,
    renovation: p.renovation,
    year_built: p.yearBuilt,
    address: p.address,
    price_label: p.priceLabel, // below / fair / above или null
    predicted_price_usd: p.predictedPriceUsd,
    description: p.descriptionRu,
  }
}

export function mortgageResult(a: z.infer<typeof mortgageArgs>) {
  const down = (a.price * a.down_percent) / 100
  const loan = a.price - down
  const monthly = monthlyPayment(loan, a.rate_percent, a.term_years)
  const total = monthly * Math.round(a.term_years * 12)
  return {
    price_usd: a.price,
    down_payment_usd: Math.round(down),
    loan_usd: Math.round(loan),
    monthly_payment_usd: Math.round(monthly),
    overpayment_usd: Math.round(total - loan),
    params: { down_percent: a.down_percent, term_years: a.term_years, rate_percent: a.rate_percent },
    note: 'Ориентировочный расчёт, итоговые условия назовёт банк',
  }
}

export function knowledgeResult(hits: KbHit[]) {
  const good = hits.filter((h) => h.similarity >= KB_MIN_SIMILARITY)
  return good.length
    ? { found: true, fragments: good.map((h) => ({ source: h.title, text: h.content })) }
    : { found: false, note: 'В базе знаний нет ответа на этот вопрос' }
}

export type { SearchFilters }
