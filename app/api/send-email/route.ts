import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

/**
 * API route pro odesílání e-mailů přes Resend.
 * Klíč RESEND_API_KEY žije pouze na serveru (v .env), nikdy se neposílá do browseru.
 *
 * POST /api/send-email
 * Headers: { "x-send-email-secret": "<SEND_EMAIL_SECRET>" }
 * { "to": "zakaznik@email.cz", "subject": "...", "html": "..." }
 *
 * BEZPEČNOST: route vyžaduje hlavičku x-send-email-secret shodnou s env proměnnou
 * SEND_EMAIL_SECRET a má jednoduchý rate limit v paměti (per IP + per příjemce).
 */

// Jednoduchý rate limit v paměti (klouzavé okno) – per instance serveru.
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

export async function POST(req: NextRequest) {
  // Ochrana: tajný klíč v hlavičce
  const secret = process.env.SEND_EMAIL_SECRET
  if (!secret || req.headers.get('x-send-email-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting podle IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(`ip:${ip}`, RATE_LIMIT.perIp.max, RATE_LIMIT.perIp.windowMs)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  try {
    const { to, subject, html } = await req.json()

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing to, subject or html' }, { status: 400 })
    }
    if (typeof to !== 'string' || !isValidEmail(to)) {
      return NextResponse.json({ error: 'Invalid recipient email' }, { status: 400 })
    }
    if (typeof subject !== 'string' || subject.length > 200) {
      return NextResponse.json({ error: 'Subject too long' }, { status: 400 })
    }
    if (typeof html !== 'string' || html.length > 100_000) {
      return NextResponse.json({ error: 'HTML too long' }, { status: 400 })
    }

    // Rate limiting podle příjemce
    if (
      isRateLimited(
        `to:${to.toLowerCase()}`,
        RATE_LIMIT.perRecipient.max,
        RATE_LIMIT.perRecipient.windowMs,
      )
    ) {
      return NextResponse.json(
        { error: 'Too many emails to this address. Try again later.' },
        { status: 429 },
      )
    }

    // Globální přepínač e-mailového providera: resend (default) | smtp (Nodemailer).
    // - resend: posílá přes Resend API (RESEND_API_KEY, RESEND_FROM).
    // - smtp: posílá přes SMTP (Nodemailer) – např. Gmail (smtp.gmail.com) nebo
    //   SMTP domény (ONE.CZ). Konfigurace: SMTP_HOST, SMTP_PORT, SMTP_SECURE,
    //   SMTP_USER, SMTP_PASS, SMTP_FROM (volitelná from adresa).
    const provider = process.env.EMAIL_PROVIDER || 'resend'

    if (provider === 'smtp') {
      const smtpHost = process.env.SMTP_HOST
      const smtpUser = process.env.SMTP_USER
      const smtpPass = process.env.SMTP_PASS
      if (!smtpHost || !smtpUser || !smtpPass) {
        return NextResponse.json(
          { error: 'SMTP_HOST, SMTP_USER or SMTP_PASS is not set' },
          { status: 500 },
        )
      }
      const smtpPort = Number(process.env.SMTP_PORT || 587)
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        // Port 465 = SSL, port 587 = STARTTLS. SMTP_SECURE=true vynutí SSL.
        secure: process.env.SMTP_SECURE
          ? process.env.SMTP_SECURE === 'true'
          : smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      })
      const from = process.env.SMTP_FROM || smtpUser
      await transporter.sendMail({ from, to, subject, html })
      return NextResponse.json({ ok: true })
    }

    // --- RESEND (default) ---
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY is not set' }, { status: 500 })
    }

    const from = process.env.RESEND_FROM || 'Rezervace <onboarding@resend.dev>'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })

    const data = await res.json()

    if (!res.ok) {
      const message =
        typeof data?.message === 'string' ? data.message : JSON.stringify(data)
      return NextResponse.json({ error: message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: data.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}