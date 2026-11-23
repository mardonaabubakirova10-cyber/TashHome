import type { Property } from '../data/properties'

export type PriceLabel = 'below' | 'fair' | 'above'

/** Оценка и метка дома (считает сервер вместе с ml-сервисом). У аренды и неоценённых домов их нет. */
export function propertyEstimate(p: Property): { predicted: number; label: PriceLabel } | null {
  return p.predictedPriceUsd && p.priceLabel ? { predicted: p.predictedPriceUsd, label: p.priceLabel } : null
}
