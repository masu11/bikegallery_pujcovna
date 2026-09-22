/**
 * České státní svátky – automatický výpočet.
 * Pevné svátky + velikonoční (Velký pátek, Velikonoční pondělí).
 */

/** Vrátí datum velikonoční neděle pro daný rok (algoritmus Meeus/Jones-Butcher). */
function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function toDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day)
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Vrátí pole českých státních svátků pro daný rok ve formátu 'yyyy-MM-dd'. */
export function getCzechHolidays(year: number): string[] {
  const easter = easterSunday(year)

  const fixed: Date[] = [
    toDate(year, 1, 1), // Nový rok
    toDate(year, 5, 1), // Svátek práce
    toDate(year, 5, 8), // Den vítězství
    toDate(year, 7, 5), // Den slovanských věrozvěstů Cyrila a Metoděje
    toDate(year, 7, 6), // Den upálení mistra Jana Husa
    toDate(year, 9, 28), // Den české státnosti
    toDate(year, 10, 28), // Den vzniku samostatného československého státu
    toDate(year, 11, 17), // Den boje za svobodu a demokracii
    toDate(year, 12, 24), // Štědrý den
    toDate(year, 12, 25), // 1. svátek vánoční
    toDate(year, 12, 26), // 2. svátek vánoční
  ]

  const goodFriday = new Date(easter)
  goodFriday.setDate(easter.getDate() - 2) // Velký pátek

  const easterMonday = new Date(easter)
  easterMonday.setDate(easter.getDate() + 1) // Velikonoční pondělí

  return [...fixed, goodFriday, easterMonday].map(formatDate)
}

/** Vrátí true, pokud je datum český státní svátek. */
export function isCzechHoliday(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  const key = formatDate(d)
  return getCzechHolidays(d.getFullYear()).includes(key)
}

/** Vrátí true, pokud je den víkend (sobota/neděle). */
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

/** Vrátí true, pokud je den nepracovní (víkend nebo státní svátek). */
export function isNonWorkingDay(date: Date): boolean {
  return isWeekend(date) || isCzechHoliday(date)
}