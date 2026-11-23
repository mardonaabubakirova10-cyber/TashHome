import { useTranslation } from 'react-i18next'
import type { Property } from '../data/properties'
import { propertyEstimate, type PriceLabel } from '../lib/priceLabel'
import Badge from './ui/Badge'

const tones = { below: 'success', fair: 'neutral', above: 'danger' } as const

export function LabelBadge({ label }: { label: PriceLabel }) {
  const { t } = useTranslation()
  return <Badge tone={tones[label]}>{t(`priceLabel.${label}`)}</Badge>
}

/** Метка «ниже / по / выше рынка» для карточки дома. Показывается только у домов на продажу. */
export default function PriceLabelBadge({ item }: { item: Property }) {
  const e = propertyEstimate(item)
  return e ? <LabelBadge label={e.label} /> : null
}
