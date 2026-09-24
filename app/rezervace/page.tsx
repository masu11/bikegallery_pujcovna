'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, isSupabaseConfigured, formatPrice } from '@/lib/supabase'
import type { Discount } from '@/lib/types'
import { getCart, removeFromCart, clearCart } from '@/lib/cart'
import { calcPrice } from '@/lib/pricing'
import { sendEmail, confirmationEmailHtml } from '@/lib/email'

export default function ReservationPage() {
  const router = useRouter()
  const [items, setItems] = useState(getCart())
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [emailWarning, setEmailWarning] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    note: '',
    consent: false,
  })

  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase
      .from('discounts')
      .select('*')
      .eq('active', true)
      .then(({ data }) => setDiscounts(data ?? []))
  }, [])

  const totals = useMemo(() => {
    let base = 0
    let seasonal = 0
    let multiDay = 0
    for (const item of items) {
      const p = calcPrice(item.price_per_day, item.days, discounts)
      base += p.base_total
      seasonal += p.seasonal_discount
      multiDay += p.multi_day_discount
    }
    return { base, seasonal, multiDay, total: base - seasonal - multiDay }
  }, [items, discounts])

  function handleRemove(index: number) {
    removeFromCart(index)
    setItems(getCart())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.consent) {
      setError('Pro odeslání rezervace je nutné souhlasit se zpracováním osobních údajů.')
      return
    }
    if (!form.name || !form.email || !form.phone) {
      setError('Vyplňte prosím jméno, e-mail a telefon.')
      return
    }
    if (items.length === 0) {
      setError('Košík je prázdný.')
      return
    }
    if (!isSupabaseConfigured) {
      setError('Systém není nakonfigurován (chybí Supabase).')
      return
    }

    setSubmitting(true)

    const reservationNumber = `BG-${Date.now().toString(36).toUpperCase()}`

    // Rezervace + položky se vytvoří v JEDNÉ transakci přes funkci create_reservation
    // (security definer v Supabase). Funkce zkontroluje překryv termínů a při konfliktu
    // vrátí chybu – v DB pak nezůstane osiřelá rezervace bez položek.
    const { error: createError } = await supabase.rpc('create_reservation', {
      p_reservation_number: reservationNumber,
      p_customer_name: form.name,
      p_customer_email: form.email,
      p_customer_phone: form.phone,
      p_customer_address: form.address,
      p_start_date: items[0].start_date,
      p_end_date: items[0].end_date,
      p_total_price: totals.total,
      p_discount_amount: totals.seasonal + totals.multiDay,
      p_notes: form.note || null,
      p_items: items.map((item) => ({
        bike_variant_id: item.variant_id,
        bike_name: item.bike_name,
        variant_label: item.variant_label,
        price_per_day: item.price_per_day,
        days: item.days,
        subtotal: item.price_per_day * item.days,
      })),
    })

    if (createError) {
      const msg = createError.message.includes('create_reservation')
        ? 'Systém není plně nastaven (chybí databázová funkce). Spusťte prosím supabase/schema.sql v Supabase SQL Editoru.'
        : createError.message
      setError(`Rezervaci se nepodařilo uložit: ${msg}`)
      setSubmitting(false)
      return
    }

    // Odeslání potvrzovacího e-mailu klientovi
    const emailResult = await sendEmail({
      to: form.email,
      subject: `Rezervace ${reservationNumber} — potvrzení požadavku`,
      html: confirmationEmailHtml({
        reservationNumber,
        name: form.name,
        startDate: items[0].start_date,
        endDate: items[0].end_date,
        totalPrice: formatPrice(totals.total),
        items: items.map((it) => ({
          bikeName: it.bike_name,
          variantLabel: it.variant_label,
          days: it.days,
          pricePerDay: formatPrice(it.price_per_day),
          subtotal: formatPrice(it.price_per_day * it.days),
        })),
      }),
    })

    clearCart()
    setItems([])
    setSuccess(reservationNumber)
    setEmailWarning(
      emailResult.ok
        ? null
        : emailResult.error ?? 'Potvrzovací e-mail se nepodařilo odeslat.',
    )
    setSubmitting(false)
  }

  if (success) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-xl rounded-lg border border-green-200 bg-green-50 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-2xl text-white">
            ✓
          </div>
          <h1 className="mt-4 text-2xl font-black text-brand-dark">Požadavek odeslán</h1>
          <p className="mt-2 text-gray-600">
            Děkujeme! Váš požadavek <strong>{success}</strong> jsme přijali.
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Na váš e-mail jsme odeslali potvrzení. Jakmile rezervaci potvrdíme, obdržíte e-mail
            s QR kódem na platbu.
          </p>
          {emailWarning && (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-left text-sm text-amber-800">
              <p className="font-semibold">Upozornění k e-mailu</p>
              <p className="mt-1">{emailWarning}</p>
              <p className="mt-1 text-xs">
                Rezervace je uložená, ale potvrzovací e-mail se nepodařilo doručit. Kontaktujte nás
                prosím telefonicky nebo e-mailem.
              </p>
            </div>
          )}
          <Link href="/galerie" className="btn-primary mt-6">
            Zpět do galerie
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-black text-brand-dark">Rezervace</h1>
      <p className="mt-2 text-gray-600">
        Zkontrolujte vybraná kola a vyplňte kontaktní údaje. Rezervaci potvrdíme e-mailem.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        {/* Košík */}
        <div className="lg:col-span-3">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center">
              <p className="text-gray-600">Váš košík je prázdný.</p>
              <Link href="/galerie" className="btn-primary mt-4">
                Vybrat kolo
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="card flex items-center justify-between p-4">
                  <div>
                    <p className="font-bold text-brand-dark">{item.bike_name}</p>
                    <p className="text-sm text-gray-600">
                      {item.variant_label} · {item.start_date} → {item.end_date} ({item.days} dní)
                    </p>
                    <p className="mt-1 text-sm font-semibold text-brand-dark">
                      {formatPrice(item.price_per_day)} / den
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-brand-dark">
                      {formatPrice(item.price_per_day * item.days)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="text-sm font-semibold text-red-600 hover:underline"
                    >
                      Odebrat
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formulář + souhrn */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card p-6">
            <h2 className="text-lg font-bold text-brand-dark">Kontaktní údaje</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="label" htmlFor="name">Jméno a příjmení *</label>
                <input
                  id="name"
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="email">E-mail *</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="phone">Telefon *</label>
                <input
                  id="phone"
                  type="tel"
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="address">Adresa</label>
                <input
                  id="address"
                  className="input"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="note">Poznámka</label>
                <textarea
                  id="note"
                  className="input"
                  rows={3}
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-gray-50 p-4">
              <div className="flex justify-between text-sm">
                <span>Mezisoučet</span>
                <span>{formatPrice(totals.base)}</span>
              </div>
              {totals.seasonal > 0 && (
                <div className="mt-1 flex justify-between text-sm text-green-700">
                  <span>Sezónní sleva</span>
                  <span>−{formatPrice(totals.seasonal)}</span>
                </div>
              )}
              {totals.multiDay > 0 && (
                <div className="mt-1 flex justify-between text-sm text-green-700">
                  <span>Množstevní sleva</span>
                  <span>−{formatPrice(totals.multiDay)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 font-black text-brand-dark">
                <span>Celkem</span>
                <span>{formatPrice(totals.total)}</span>
              </div>
            </div>

            <label className="mt-4 flex items-start gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={form.consent}
                onChange={(e) => setForm({ ...form, consent: e.target.checked })}
              />
              <span>
                Souhlasím se zpracováním osobních údajů za účelem vyřízení rezervace.{' '}
                <Link href="/ochrana-osobnich-udaju" className="text-brand-secondary hover:underline">
                  Více informací
                </Link>
              </span>
            </label>

            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="btn-primary mt-4 w-full disabled:opacity-50"
            >
              {submitting ? 'Odesílám…' : 'Odeslat požadavek'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}