// Supabase Edge Function: send-email
// Odesílá e-maily přes Resend (default) nebo SMTP (Nodemailer).
//
// Globální přepínač: EMAIL_PROVIDER=resend (default) | smtp
// - resend: posílá přes Resend API (RESEND_API_KEY, RESEND_FROM).
// - smtp: posílá přes SMTP (Nodemailer) – např. Gmail (smtp.gmail.com) nebo
//   SMTP domény (ONE.CZ). Konfigurace: SMTP_HOST, SMTP_PORT, SMTP_SECURE,
//   SMTP_USER, SMTP_PASS, SMTP_FROM (volitelná from adresa).
//
// Nasazení:
//   1. supabase login
//   2. supabase link --project-ref VAS_PROJECT_REF
//   3. supabase secrets set RESEND_API_KEY=re_xxx RESEND_FROM="..." SEND_EMAIL_SECRET=...
//      (pro SMTP místo Resendu: supabase secrets set EMAIL_PROVIDER=smtp SMTP_HOST=... SMTP_USER=... SMTP_PASS=...)
//   4. supabase functions deploy send-email
//
// Volání z klienta:
//   POST https://VAS_PROJECT_REF.supabase.co/functions/v1/send-email
//   Headers: { "x-send-email-secret": "<SEND_EMAIL_SECRET>" }
//   { "to": "zakaznik@email.cz", "subject": "...", "html": "..." }
//
// BEZPEČNOST:
// - Funkce vyžaduje hlavičku x-send-email-secret shodnou s env proměnnou
//   SEND_EMAIL_SECRET (nastavenou přes `supabase secrets set`). Bez ní vrací 401.
//   Tajný klíč se do client bundle dostane přes NEXT_PUBLIC_SEND_EMAIL_SECRET –
//   není to dokonalá ochrana (statický web), ale zabrání náhodnému zneužití.
// - Rate limiting v paměti (per IP + per příjemce) – první obrana proti spamu.
//   Poznámka: Edge Functions jsou bezstavové, limit je per instance.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
// Deno podporuje npm knihovny přes npm: specifikátor (stejná verze jako v package.json).
import nodemailer from 'npm:nodemailer@10.0.10'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('RESEND_FROM') || 'Rezervace <rezervace@vasedomena.cz>'
const SEND_EMAIL_SECRET = Deno.env.get('SEND_EMAIL_SECRET')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-send-email-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Jednoduchý rate limit v paměti (klouzavé okno).
// Klíč: "ip:<ip>" nebo "to:<email>", hodnota: pole časových razítek.
const RATE_LIMIT = {
  perRecipient: { max: 5, windowMs: 60 * 60 * 1000 }, // 5 e-mailů / hod / příjemce
  perIp: { max: 20, windowMs: 60 * 60 * 1000 }, // 20 e-mailů / hod / IP
}
const hits = new Map<string, number[]>()

function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= max) {
    hits.set(key, recent)
    return true
  }
  recent.push(now)
  hits.set(key, recent)
  return false
}

function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // Ochrana: tajný klíč v hlavičce
  if (!SEND_EMAIL_SECRET || req.headers.get('x-send-email-secret') !== SEND_EMAIL_SECRET) {
    return json({ error: 'Unauthorized' }, 401)
  }

  // Rate limiting podle IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(`ip:${ip}`, RATE_LIMIT.perIp.max, RATE_LIMIT.perIp.windowMs)) {
    return json({ error: 'Too many requests. Try again later.' }, 429)
  }

  try {
    const { to, subject, html } = await req.json()

    if (!to || !subject || !html) {
      return json({ error: 'Missing to, subject or html' }, 400)
    }
    if (typeof to !== 'string' || !isValidEmail(to)) {
      return json({ error: 'Invalid recipient email' }, 400)
    }
    if (typeof subject !== 'string' || subject.length > 200) {
      return json({ error: 'Subject too long' }, 400)
    }
    if (typeof html !== 'string' || html.length > 100_000) {
      return json({ error: 'HTML too long' }, 400)
    }

    // Rate limiting podle příjemce
    if (
      isRateLimited(
        `to:${to.toLowerCase()}`,
        RATE_LIMIT.perRecipient.max,
        RATE_LIMIT.perRecipient.windowMs,
      )
    ) {
      return json({ error: 'Too many emails to this address. Try again later.' }, 429)
    }

    // Globální přepínač e-mailového providera: resend (default) | smtp (Nodemailer).
    const provider = Deno.env.get('EMAIL_PROVIDER') || 'resend'

    if (provider === 'smtp') {
      const smtpHost = Deno.env.get('SMTP_HOST')
      const smtpUser = Deno.env.get('SMTP_USER')
      const smtpPass = Deno.env.get('SMTP_PASS')
      if (!smtpHost || !smtpUser || !smtpPass) {
        return json({ error: 'SMTP_HOST, SMTP_USER or SMTP_PASS not set' }, 500)
      }
      const smtpPort = Number(Deno.env.get('SMTP_PORT') || 587)
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        // Port 465 = SSL, port 587 = STARTTLS. SMTP_SECURE=true vynutí SSL.
        secure: Deno.env.get('SMTP_SECURE')
          ? Deno.env.get('SMTP_SECURE') === 'true'
          : smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      })
      const from = Deno.env.get('SMTP_FROM') || smtpUser
      await transporter.sendMail({ from, to, subject, html })
      return json({ ok: true }, 200)
    }

    // --- RESEND (default) ---
    if (!RESEND_API_KEY) {
      return json({ error: 'RESEND_API_KEY not set' }, 500)
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return json({ error: data }, 500)
    }

    return json({ ok: true, id: data.id }, 200)
  } catch (err) {
    return json({ error: String(err) }, 500)
  }
})