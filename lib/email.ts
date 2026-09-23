/**
 * Pomocné funkce pro odesílání e-mailů přes Resend.
 *
 * Cíl odeslání:
 * - Lokálně (Next.js dev server): API route /api/send-email (klíč RESEND_API_KEY na serveru).
 * - Produkce (GitHub Pages = statický hosting): API route NEexistuje, proto se použije
 *   Supabase Edge Function. Nastavte NEXT_PUBLIC_SEND_EMAIL_URL na adresu funkce:
 *   https://VAS_PROJECT_REF.supabase.co/functions/v1/send-email
 */

const API_URL =
  process.env.NEXT_PUBLIC_SEND_EMAIL_URL || '/api/send-email'

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      return { ok: false, error: data?.error ?? 'Chyba odeslání e-mailu.' }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

/** HTML šablona potvrzení požadavku na rezervaci. */
export function confirmationEmailHtml(params: {
  reservationNumber: string
  name: string
  startDate: string
  endDate: string
  totalPrice: string
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
      <p>Jakmile rezervaci potvrdíme, obdržíte e-mail s QR kódem na platbu.</p>
      <p style="color: #999; font-size: 12px;">Bike Gallery Půjčovna</p>
    </div>
  `
}

/** HTML šablona potvrzení rezervace s QR kódem. */
export function qrEmailHtml(params: {
  reservationNumber: string
  name: string
  startDate: string
  endDate: string
  totalPrice: string
  qrSvg: string
  bankBeneficiary: string
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
      <p>Pro zaplacení naskenujte QR kód bankovní aplikací:</p>
      <div style="margin: 16px 0;">${params.qrSvg}</div>
      <p>Po připsání platby je termín definitivně obsazený.</p>
      <p style="color: #999; font-size: 12px;">Bike Gallery Půjčovna</p>
    </div>
  `
}