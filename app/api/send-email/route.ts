import { NextRequest, NextResponse } from 'next/server'

/**
 * API route pro odesílání e-mailů přes Resend.
 * Klíč RESEND_API_KEY žije pouze na serveru (v .env), nikdy se neposílá do browseru.
 *
 * POST /api/send-email
 * { "to": "zakaznik@email.cz", "subject": "...", "html": "..." }
 */

export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not set' }, { status: 500 })
  }

  try {
    const { to, subject, html } = await req.json()

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing to, subject or html' }, { status: 400 })
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