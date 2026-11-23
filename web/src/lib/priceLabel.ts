import predictions from '../data/predictions.json'
import type { Property } from '../data/properties'

export type PriceLabel = 'below' | 'fair' | 'above'

/** Отклонение цены от оценки модели: меньше −10 % — ниже рынка, больше +10 % — выше, иначе по рынку. */
export function labelFor(price: number, predicted: number): PriceLabel {
  const dev = (price - predicted) / predicted
  return dev < -0.1 ? 'below' : dev > 0.1 ? 'above' : 'fair'
}

const predicted = predictions as Record<string, number>

/** Оценка и метка для демо-дома. Для аренды метки нет. Оценки считает ml/score_demo.py. */
export function propertyEstimate(p: Property): { predicted: number; label: PriceLabel } | null {
  const value = p.dealType === 'sale' ? predicted[p.id] : undefined
  return value ? { predicted: value, label: labelFor(p.priceUsd, value) } : null
}
