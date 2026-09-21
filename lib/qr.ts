/**
 * Generování českého QR kódu pro platbu (standard QR Platby dle ČBA).
 * Formát: SPD*1.0*ACC:IBAN*AM:částka*CC:CZK*MSG:zpráva*X-VS:variabilní symbol
 */
export function buildQrPaymentString(params: {
  iban: string
  amount: number
  variableSymbol: string
  message?: string
}): string {
  const parts = ['SPD*1.0*']
  parts.push(`ACC:${params.iban.replace(/\s/g, '').toUpperCase()}`)
  parts.push(`AM:${params.amount.toFixed(2)}`)
  parts.push('CC:CZK')
  if (params.message) {
    parts.push(`MSG:${params.message.slice(0, 60)}`)
  }
  parts.push(`X-VS:${params.variableSymbol}`)
  return parts.join('*')
}

/** Převod čísla účtu (123456789/0100) na IBAN — placeholder, doplňte skutečný IBAN v nastavení. */
export function accountToIban(account: string): string {
  // Toto je zjednodušení — skutečný IBAN se zadává v nastavení adminu.
  return account
}