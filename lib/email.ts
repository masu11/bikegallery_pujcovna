/**
 * Pomocné funkce pro odesílání e-mailů přes Resend.
 *
 * Cíl odeslání:
 * - Lokálně (Next.js dev server): API route /api/send-email (klíč RESEND_API_KEY na serveru).
 * - Produkce (GitHub Pages = statický hosting): API route NEexistuje, proto se použije
 *   Supabase Edge Function. Nastavte NEXT_PUBLIC_SEND_EMAIL_URL na adresu funkce:
 *   https://VAS_PROJECT_REF.supabase.co/functions/v1/send-email
 */

// Pozor: next.config.mjs má trailingSlash: true → Next.js přesměrovává
// /api/send-email na /api/send-email/ (HTTP 308). Voláme rovnou s lomítkem,
// aby odpadlo přesměrování (někteří klienti 308 pro POST nesledují).
const LOCAL_API_URL = '/api/send-email/'

/** Získá text chyby z odpovědi (řetězec nebo objekt). */
function extractError(data: unknown, fallback: string): string {
  if (typeof data === 'string') return data
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    if (typeof obj.error === 'string') return obj.error
    if (obj.error && typeof obj.error === 'object') {
      const errObj = obj.error as Record<string, unknown>
      if (typeof errObj.message === 'string') return errObj.message
      return JSON.stringify(errObj)
    }
    if (typeof obj.message === 'string') return obj.message
  }
  return fallback
}

/** Odešle e-mail na danou URL. Vrací ok, error a příznaky 404 / síťové chyby. */
async function postEmail(
  url: string,
  params: { to: string; subject: string; html: string },
): Promise<{ ok: boolean; error?: string; notFound?: boolean; networkError?: boolean }> {
  try {
    // Supabase Edge Function má defaultně zapnutou kontrolu JWT – stačí poslat
    // apikey hlavičku s anon klíčem (ten je veřejný, je součástí client bundle).
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      headers['apikey'] = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    })

    // Statický hosting (GitHub Pages) vrací místo JSON HTML 404 stránku.
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('application/json')) {
      return {
        ok: false,
        error: `E-mailová služba neodpověděla JSON (HTTP ${res.status}). Na statickém hostingu API route nefunguje – nasaďte Supabase Edge Function a nastavte NEXT_PUBLIC_SEND_EMAIL_URL.`,
      }
    }

    const data = await res.json()
    if (!res.ok) {
      return {
        ok: false,
        error: extractError(data, `Chyba odeslání e-mailu (HTTP ${res.status}).`),
        notFound: res.status === 404,
      }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err), networkError: true }
  }
}

/**
 * Odeslání e-mailu přes Resend.
 *
 * Cíl odeslání:
 * - Pokud je nastaveno NEXT_PUBLIC_SEND_EMAIL_URL → Supabase Edge Function
 *   (funguje ze všech prostředí: localhost, GitHub Pages, finální hosting).
 *   Pokud funkce není nasazená (404) nebo dojde k síťové chybě, spadneme
 *   na lokální API route /api/send-email/ (funguje na dev serveru).
 * - Bez NEXT_PUBLIC_SEND_EMAIL_URL → lokální API route s jedním opakováním
 *   při přechodné síťové chybě (Next.js v dev režimu kompiluje route až při
 *   prvním požadavku a spojení se může přerušit).
 */
export async function sendEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<{ ok: boolean; error?: string }> {
  const primaryUrl = process.env.NEXT_PUBLIC_SEND_EMAIL_URL

  if (primaryUrl) {
    const result = await postEmail(primaryUrl, params)
    if (result.ok) return result

    // Fallback na lokální API route jen při 404 (funkce nenasazená) nebo
    // síťové chybě. Reálné chyby (např. Resend free plán) se vrací rovnou.
    if (result.notFound || result.networkError) {
      const fallback = await postEmail(LOCAL_API_URL, params)
      if (fallback.ok) return fallback
      return {
        ok: false,
        error: `Edge Function: ${result.error}. Lokální route: ${fallback.error}`,
      }
    }
    return result
  }

  // Lokální API route s jedním opakováním při přechodné síťové chybě.
  const first = await postEmail(LOCAL_API_URL, params)
  if (first.ok || !first.networkError) return first
  await new Promise((r) => setTimeout(r, 1500))
  return postEmail(LOCAL_API_URL, params)
}

/** Řádky tabulky kol pro e-mailové šablony. */
function itemsRowsHtml(
  items: { bikeName: string; variantLabel: string; days: number; pricePerDay: string; subtotal: string }[],
): string {
  return items
    .map(
      (it) => `
    <tr>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${it.bikeName}</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${it.variantLabel}</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${it.days} dní</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${it.pricePerDay}</td>
      <td style="padding: 6px 12px; border-bottom: 1px solid #eee;">${it.subtotal}</td>
    </tr>`,
    )
    .join('')
}

/** HTML šablona potvrzení požadavku na rezervaci. */
export function confirmationEmailHtml(params: {
  reservationNumber: string
  name: string
  startDate: string
  endDate: string
  totalPrice: string
  items: { bikeName: string; variantLabel: string; days: number; pricePerDay: string; subtotal: string }[]
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #383838;">Děkujeme za rezervaci!</h2>
      <p>Dobrý den, ${params.name},</p>
      <p>Váš požadavek na rezervaci <strong>${params.reservationNumber}</strong> jsme přijali.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Termín:</td><td style="padding: 4px 0; font-weight: bold;">${params.startDate} → ${params.endDate}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Cena:</td><td style="padding: 4px 0; font-weight: bold;">${params.totalPrice}</td></tr>
      </table>
      <h3 style="color: #383838;">Kola</h3>
      <table style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 6px 12px; text-align: left;">Kolo</th>
            <th style="padding: 6px 12px; text-align: left;">Varianta</th>
            <th style="padding: 6px 12px; text-align: left;">Dny</th>
            <th style="padding: 6px 12px; text-align: left;">Cena/den</th>
            <th style="padding: 6px 12px; text-align: left;">Mezisoučet</th>
          </tr>
        </thead>
        <tbody>${itemsRowsHtml(params.items)}</tbody>
      </table>
      <p>Jakmile rezervaci potvrdíme, obdržíte e-mail s QR kódem na platbu.</p>
      <p style="color: #999; font-size: 12px;">Bike Gallery Půjčovna</p>
    </div>
  `
}

/** HTML šablona potvrzení rezervace s QR kódem (QR jako veřejný URL – SVG a data: URI e-mailové klienty nerenderují/blokují). */
export function qrEmailHtml(params: {
  reservationNumber: string
  name: string
  startDate: string
  endDate: string
  totalPrice: string
  qrUrl: string
  bankBeneficiary: string
  items: { bikeName: string; variantLabel: string; days: number; pricePerDay: string; subtotal: string }[]
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #383838;">Rezervace potvrzena</h2>
      <p>Dobrý den, ${params.name},</p>
      <p>Vaše rezervace <strong>${params.reservationNumber}</strong> byla potvrzena.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Termín:</td><td style="padding: 4px 0; font-weight: bold;">${params.startDate} → ${params.endDate}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Cena:</td><td style="padding: 4px 0; font-weight: bold;">${params.totalPrice}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Příjemce:</td><td style="padding: 4px 0;">${params.bankBeneficiary}</td></tr>
      </table>
      <h3 style="color: #383838;">Kola</h3>
      <table style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 6px 12px; text-align: left;">Kolo</th>
            <th style="padding: 6px 12px; text-align: left;">Varianta</th>
            <th style="padding: 6px 12px; text-align: left;">Dny</th>
            <th style="padding: 6px 12px; text-align: left;">Cena/den</th>
            <th style="padding: 6px 12px; text-align: left;">Mezisoučet</th>
          </tr>
        </thead>
        <tbody>${itemsRowsHtml(params.items)}</tbody>
      </table>
      <p>Pro zaplacení naskenujte QR kód bankovní aplikací:</p>
      <div style="margin: 16px 0;">
        <img src="${params.qrUrl}" alt="QR kód na platbu" width="200" height="200" style="display:block; width:200px; height:200px;" />
      </div>
      <p>Po připsání platby je termín definitivně obsazený.</p>
      <p style="color: #999; font-size: 12px;">Bike Gallery Půjčovna</p>
    </div>
  `
}