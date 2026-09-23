/**
 * Generování českého QR kódu pro platbu (standard QR Platby dle ČBA).
 * Specifikace: https://qrplatby.cz
 *
 * Formát (pořadí polí je ZÁVAZNÉ):
 *   SPD*1.0*ACC:IBAN*CC:CZK*AM:částka*X-VS:variabilní symbol*MSG:zpráva*RN:příjemce*CRC32:checksum*
 *
 * Povinné prvky: SPD verze, ACC, CC, AM, X-VS a CRC32 kontrolní součet.
 * Řetězec vždy končí hvězdičkou.
 */

/** CRC-32 (IEEE 802.3) – kontrolní součet používaný ve standardu QR Platby. */
function crc32(input: string): string {
  let crc = 0xffffffff
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i)
    for (let j = 0; j < 8; j++) {
      // >>> (unsigned shift) je důležité – >> rozšiřuje znaménko a zkazí výsledek.
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  // >>> 0 převede znaménkový 32-bit int na neznaménkový před převodem na hex.
  return ((crc ^ 0xffffffff) >>> 0).toString(16).toUpperCase().padStart(8, '0')
}

/**
 * Sestaví řetězec QR Platby dle standardu ČBA.
 * - IBAN se očistí od mezer a převede na velká písmena.
 * - Částka se formátuje s desetinnou tečkou a dvěma desetinnými místy (AM:1234.56).
 * - Variabilní symbol se očistí na číslice (max. 10 znaků).
 * - Na konec se přidá CRC32 kontrolní součet a závěrečná hvězdička.
 */
export function buildQrPaymentString(params: {
  iban: string
  amount: number
  variableSymbol: string
  message?: string
  recipientName?: string
}): string {
  const iban = params.iban.replace(/\s/g, '').toUpperCase()
  const amount = params.amount.toFixed(2)
  const vs = params.variableSymbol.replace(/\D/g, '').slice(0, 10) || '1'

  // Pořadí polí dle specifikace QR Platby (ČBA) – nesmí se měnit!
  const fields: string[] = []
  fields.push(`ACC:${iban}`)
  fields.push('CC:CZK')
  fields.push(`AM:${amount}`)
  fields.push(`X-VS:${vs}`)
  if (params.message) {
    fields.push(`MSG:${params.message.slice(0, 60)}`)
  }
  if (params.recipientName) {
    fields.push(`RN:${params.recipientName.slice(0, 35)}`)
  }

  // CRC32 se počítá z celého řetězce BEZ pole CRC32 (řetězec končí hvězdičkou).
  const withoutCrc = `SPD*1.0*${fields.join('*')}*`
  return `${withoutCrc}CRC32:${crc32(withoutCrc)}*`
}

/**
 * Ověří formát a kontrolní součet IBAN (mod 97).
 * Vrací true, pokud je IBAN strukturně platný.
 */
export function isValidIban(iban: string): boolean {
  const clean = iban.replace(/\s/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(clean)) return false

  // Přesun prvních 4 znaků na konec a převod písmen na čísla (A=10 … Z=35).
  // Písmeno se rozšiřuje na DVĚ číslice (např. W=32 → „32“), proto * 100.
  const rearranged = clean.slice(4) + clean.slice(0, 4)
  let remainder = 0
  for (let i = 0; i < rearranged.length; i++) {
    const ch = rearranged[i]
    if (/\d/.test(ch)) {
      remainder = (remainder * 10 + Number(ch)) % 97
    } else {
      remainder = (remainder * 100 + (ch.charCodeAt(0) - 55)) % 97
    }
  }
  return remainder === 1
}

/** Převod čísla účtu (123456789/0100) na IBAN — placeholder, doplňte skutečný IBAN v nastavení. */
export function accountToIban(account: string): string {
  // Toto je zjednodušení — skutečný IBAN se zadává v nastavení adminu.
  return account
}