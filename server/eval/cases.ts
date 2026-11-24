import type { Property } from '../src/lib/demoProperties.js'

/** Ограничения, которым должен удовлетворять каждый дом в ответе ассистента. */
export type Constraint = {
  deal?: 'sale' | 'rent'
  district?: string
  minRooms?: number
  maxPrice?: number
  minPrice?: number
  minArea?: number
  minLand?: number
}

export const matches = (c: Constraint, p: Property): boolean =>
  (!c.deal || p.dealType === c.deal) &&
  (!c.district || p.districtId === c.district) &&
  (c.minRooms === undefined || p.rooms >= c.minRooms) &&
  (c.maxPrice === undefined || p.priceUsd <= c.maxPrice) &&
  (c.minPrice === undefined || p.priceUsd >= c.minPrice) &&
  (c.minArea === undefined || p.areaM2 >= c.minArea) &&
  (c.minLand === undefined || p.landSotka >= c.minLand)

export type SearchCase = { q: string; lang: 'ru' | 'uz'; c: Constraint }

/**
 * 30 запросов на подбор домов. Эталон считается по каталогу: если подходящие дома есть, ассистент должен показать хотя бы один
 * и ни одного неподходящего; если подходящих нет, он не должен показывать дома.
 */
export const SEARCH_CASES: SearchCase[] = [
  { q: 'Хочу купить дом в Юнусабаде', lang: 'ru', c: { deal: 'sale', district: 'yunusabad' } },
  { q: 'Покажи дома на продажу в Чиланзаре', lang: 'ru', c: { deal: 'sale', district: 'chilanzar' } },
  { q: 'Нужна аренда дома в Мирабаде', lang: 'ru', c: { deal: 'rent', district: 'mirabad' } },
  { q: 'Куплю дом до 100 тысяч долларов', lang: 'ru', c: { deal: 'sale', maxPrice: 100000 } },
  { q: 'Ищу дом на продажу от 4 комнат, бюджет до 150 000 $', lang: 'ru', c: { deal: 'sale', minRooms: 4, maxPrice: 150000 } },
  { q: 'Хочу купить дом с участком не меньше 10 соток', lang: 'ru', c: { deal: 'sale', minLand: 10 } },
  { q: 'Куплю дом площадью от 200 квадратных метров', lang: 'ru', c: { deal: 'sale', minArea: 200 } },
  { q: 'Дом на 5 комнат и больше в Сергели', lang: 'ru', c: { district: 'sergeli', minRooms: 5 } },
  { q: 'Купить дом в Яккасарае до 300 тысяч', lang: 'ru', c: { deal: 'sale', district: 'yakkasaray', maxPrice: 300000 } },
  { q: 'Сниму дом за 500 долларов в месяц или дешевле', lang: 'ru', c: { deal: 'rent', maxPrice: 500 } },
  { q: 'Покажи дома в Алмазаре', lang: 'ru', c: { district: 'almazar' } },
  { q: 'Дом в Шайхантахуре на продажу, минимум 3 комнаты', lang: 'ru', c: { deal: 'sale', district: 'shaykhantakhur', minRooms: 3 } },
  { q: 'Хочу купить большой дом от 6 комнат', lang: 'ru', c: { deal: 'sale', minRooms: 6 } },
  { q: 'Дом в Мирзо-Улугбеке до 200 тысяч, куплю', lang: 'ru', c: { deal: 'sale', district: 'mirzo-ulugbek', maxPrice: 200000 } },
  { q: 'Нужен недорогой дом в Учтепе, до 120000 долларов', lang: 'ru', c: { deal: 'sale', district: 'uchtepa', maxPrice: 120000 } },
  { q: 'Дом в Яшнабаде с участком от 8 соток', lang: 'ru', c: { district: 'yashnabad', minLand: 8 } },
  { q: 'Куплю дом в Янгихаёте', lang: 'ru', c: { deal: 'sale', district: 'yangihayot' } },
  { q: 'Что есть в аренду в Юнусабаде?', lang: 'ru', c: { deal: 'rent', district: 'yunusabad' } },
  { q: 'Покупаю дом от 100 до 180 тысяч долларов', lang: 'ru', c: { deal: 'sale', minPrice: 100000, maxPrice: 180000 } },
  { q: 'Нужен дом от 150 метров и от 4 комнат на продажу', lang: 'ru', c: { deal: 'sale', minArea: 150, minRooms: 4 } },
  // подходящих домов нет: ассистент не должен выдумывать
  { q: 'Куплю дом в Бектемире за 20 тысяч долларов', lang: 'ru', c: { deal: 'sale', district: 'bektemir', maxPrice: 20000 } },
  { q: 'Хочу снять дом в Мирабаде за 50 долларов в месяц', lang: 'ru', c: { deal: 'rent', district: 'mirabad', maxPrice: 50 } },
  { q: 'Дом на продажу от 15 комнат', lang: 'ru', c: { deal: 'sale', minRooms: 15 } },
  // узбекский язык
  { q: 'Yunusobodda 250 ming dollargacha uy sotib olmoqchiman', lang: 'uz', c: { deal: 'sale', district: 'yunusabad', maxPrice: 250000 } },
  { q: 'Chilonzorda ijaraga uy kerak', lang: 'uz', c: { deal: 'rent', district: 'chilanzar' } },
  { q: '5 xonali uy kerak, narxi 150 ming dollargacha, sotib olaman', lang: 'uz', c: { deal: 'sale', minRooms: 5, maxPrice: 150000 } },
  { q: 'Sergeli tumanida uy ko‘rsating', lang: 'uz', c: { district: 'sergeli' } },
  { q: 'Mirzo Ulug‘bek tumanida sotiladigan uylar', lang: 'uz', c: { deal: 'sale', district: 'mirzo-ulugbek' } },
  { q: 'Kamida 10 sotix yerli uy sotib olmoqchiman', lang: 'uz', c: { deal: 'sale', minLand: 10 } },
  { q: 'Yakkasaroyda ijaraga uy bormi?', lang: 'uz', c: { deal: 'rent', district: 'yakkasaray' } },
]

export type KbCase = {
  q: string
  lang: 'ru' | 'uz'
  /** Что должно быть в верном ответе (для судьи). Для вопросов вне базы знаний: ответ «не знаю» без выдумок. */
  expect: string
  /** true: ответа в базе знаний нет, ассистент должен честно сказать, что не знает, и не выдумывать */
  outOfScope?: boolean
}

/** 20 вопросов к базе знаний: 16 с ответом в документах и 4 вне темы. */
export const KB_CASES: KbCase[] = [
  { q: 'Какие документы нужны от продавца при покупке дома?', lang: 'ru', expect: 'паспорт владельца; документ о праве собственности на дом и участок; технический и кадастровый паспорт; справки об отсутствии долгов за коммунальные услуги' },
  { q: 'Нужно ли согласие супруга, если дом куплен в браке?', lang: 'ru', expect: 'да, нужно согласие супруга или супруги, оформленное по закону (нотариально)' },
  { q: 'Что делать, если в доме прописаны несовершеннолетние?', lang: 'ru', expect: 'для сделки нужно разрешение органа опеки и попечительства' },
  { q: 'Как работает аннуитетный платёж по ипотеке?', lang: 'ru', expect: 'каждый месяц платится одинаковая сумма; в начале в ней больше процентов, в конце больше основного долга' },
  { q: 'От чего зависит ежемесячный платёж по ипотеке?', lang: 'ru', expect: 'от суммы кредита, ставки, срока и первоначального взноса' },
  { q: 'Что значит метка «ниже рынка» у дома?', lang: 'ru', expect: 'цена продавца ниже оценки модели больше чем на 10 процентов; это ориентир, а не гарантия выгодной сделки' },
  { q: 'Как проверить, что арендодатель действительно владелец дома?', lang: 'ru', expect: 'убедиться, что человек владелец или имеет письменное разрешение владельца; проверить документы' },
  { q: 'Как обычно устроены залог и платежи при аренде дома?', lang: 'ru', expect: 'часто просят оплату за первый месяц и залог; условия возврата залога должны быть прописаны в договоре; платить так, чтобы остался след' },
  { q: 'Каков порядок покупки частного дома?', lang: 'ru', expect: 'этапы: выбор и просмотр, проверка документов, цена и задаток, оформление сделки (договор, обычно через нотариуса), расчёт и передача дома' },
  { q: 'Как безопасно заплатить за дом?', lang: 'ru', expect: 'банковский перевод или аккредитив; наличные без расписки не рекомендуются; передача по акту' },
  { q: 'Как оформляется задаток?', lang: 'ru', expect: 'письменно, с указанием суммы, срока и условий возврата' },
  { q: 'Какие расходы у покупателя кроме цены дома?', lang: 'ru', expect: 'услуги нотариуса, государственные сборы, при необходимости оценщик и страхование; точные суммы уточнять у нотариуса или менеджера' },
  { q: 'Как записаться на просмотр дома?', lang: 'ru', expect: 'на странице дома кнопка «Записаться на просмотр», нужно указать имя и телефон в формате +998; менеджер свяжется' },
  { q: 'В какой валюте указаны цены на сайте?', lang: 'ru', expect: 'в долларах США; можно переключить на сумы по курсу Центрального банка' },
  { q: 'Сколько домов можно сравнить одновременно?', lang: 'ru', expect: 'от двух до четырёх домов' },
  { q: 'Ipoteka annuitet to‘lovi nima?', lang: 'uz', expect: 'har oy bir xil miqdorda to‘lanadi; boshida foizlar ko‘proq, oxirida asosiy qarz ko‘proq' },
  { q: 'Как приготовить плов?', lang: 'ru', expect: 'ассистент не отвечает на это (вне темы) и возвращает разговор к домам', outOfScope: true },
  { q: 'Какая завтра погода в Ташкенте?', lang: 'ru', expect: 'ассистент не знает и не выдумывает прогноз', outOfScope: true },
  { q: 'Какой сейчас курс биткоина?', lang: 'ru', expect: 'ассистент не знает и не выдумывает курс', outOfScope: true },
  { q: 'Какую точную ставку по ипотеке сегодня даёт Hamkorbank?', lang: 'ru', expect: 'ассистент не называет точную ставку конкретного банка, говорит что данных нет и советует уточнить в банке или у менеджера', outOfScope: true },
]
