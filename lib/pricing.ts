import type { Discount } from './types'

/** Počet dní rezervace včetně počátečního dne (od–do). */
export function calcDays(start: string, end: string): number {
  const startDate = new Date(start + 'T00:00:00')
  const endDate = new Date(end + 'T00:00:00')
  const diff = endDate.getTime() - startDate.getTime()
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1)
}

/** Nejvyšší aktivní množstevní sleva (%) pro daný počet dní. */
export function calcMultiDayDiscount(days: number, discounts: Discount[]): number {
  const applicable = discounts
    .filter((d) => d.type === 'multi_day' && d.active && d.min_days !== null && days >= (d.min_days as number))
    .sort((a, b) => (b.min_days ?? 0) - (a.min_days ?? 0))
  return applicable[0]?.value ?? 0
}

/** Sezónní sleva (%) pro dané datum. */
export function calcSeasonalDiscount(date: string, discounts: Discount[]): number {
  const d = new Date(date + 'T00:00:00')
  return discounts
    .filter((disc) => {
      if (disc.type !== 'seasonal' || !disc.active) return false
      if (disc.start_date && d < new Date(disc.start_date + 'T00:00:00')) return false
      if (disc.end_date && d > new Date(disc.end_date + 'T00:00:00')) return false
      return true
    })
    .reduce((sum, s) => sum + s.value, 0)
}

export interface PriceBreakdown {
  base_total: number
  seasonal_discount: number
  multi_day_discount: number
  total: number
}

/**
 * Výpočet ceny rezervace:
 * cena = (cena/den × dny × (1 − sezónní/100)) × (1 − množstevní/100)
 */
export function calcPrice(basePerDay: number, days: number, discounts: Discount[]): PriceBreakdown {
  const seasonal = calcSeasonalDiscount(new Date().toISOString().slice(0, 10), discounts)
  const multiDay = calcMultiDayDiscount(days, discounts)
  const baseTotal = basePerDay * days
  const afterSeasonal = baseTotal * (1 - seasonal / 100)
  const total = Math.round(afterSeasonal * (1 - multiDay / 100))
  return {
    base_total: baseTotal,
    seasonal_discount: Math.round(baseTotal * (seasonal / 100)),
    multi_day_discount: Math.round(afterSeasonal * (multiDay / 100)),
    total,
  }
}
