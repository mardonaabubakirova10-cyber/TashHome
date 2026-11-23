/** Аннуитетный платёж в месяц. Ставка — годовая, в процентах. */
export function monthlyPayment(principal: number, annualRatePercent: number, years: number): number {
  const n = Math.round(years * 12)
  if (principal <= 0 || n <= 0) return 0
  const r = annualRatePercent / 100 / 12
  if (r === 0) return principal / n
  return (principal * r) / (1 - Math.pow(1 + r, -n))
}

export type ScheduleRow = { month: number; payment: number; interest: number; principal: number; balance: number }

export function schedule(principal: number, annualRatePercent: number, years: number): ScheduleRow[] {
  const n = Math.round(years * 12)
  const payment = monthlyPayment(principal, annualRatePercent, years)
  const r = annualRatePercent / 100 / 12
  const rows: ScheduleRow[] = []
  let balance = principal
  for (let month = 1; month <= n; month++) {
    const interest = balance * r
    const part = month === n ? balance : payment - interest // последний месяц гасит остаток без хвоста округления
    balance = Math.max(0, balance - part)
    rows.push({ month, payment: part + interest, interest, principal: part, balance })
  }
  return rows
}
