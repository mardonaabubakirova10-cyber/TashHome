/** Аннуитетный платёж в месяц. Ставка — годовая, в процентах. */
export function monthlyPayment(principal: number, annualRatePercent: number, years: number): number {
  const n = Math.round(years * 12)
  if (principal <= 0 || n <= 0) return 0
  const r = annualRatePercent / 100 / 12
  if (r === 0) return principal / n
  return (principal * r) / (1 - Math.pow(1 + r, -n))
}
