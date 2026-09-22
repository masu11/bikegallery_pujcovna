'use client'

import { useEffect, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QRCodeSVG } from 'qrcode.react'
import { supabase, isSupabaseConfigured, formatPrice } from '@/lib/supabase'
import type { Bike, BikeVariant, Discount, Reservation, ReservationItem } from '@/lib/types'
import QRCode from '@/components/QRCode'
import { buildQrPaymentString } from '@/lib/qr'
import { sendEmail, qrEmailHtml } from '@/lib/email'
import { calcDays, calcPrice } from '@/lib/pricing'

const statusLabels: Record<string, string> = {
  pending: 'Čeká',
  reserved: 'Rezervované',
  occupied: 'Obsazené',
  completed: 'Dokončené',
  cancelled: 'Stornované',
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  reserved: 'bg-blue-100 text-blue-800',
  occupied: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
}

type ReservationWithItems = Reservation & { items: ReservationItem[] }

export default function AdminReservations() {
  const [reservations, setReservations] = useState<ReservationWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [bankIban, setBankIban] = useState('')
  const [bankBeneficiary, setBankBeneficiary] = useState('')

  // Ruční vytvoření rezervace
  const [bikes, setBikes] = useState<Bike[]>([])
  const [variants, setVariants] = useState<BikeVariant[]>([])
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)
  const [form, setForm] = useState({
    bikeId: '',
    variantId: '',
    startDate: '',
    endDate: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    notes: '',
    status: 'reserved',
  })

  async function load() {
    if (!isSupabaseConfigured) return
    const { data } = await supabase
      .from('reservations')
      .select('*, reservation_items(*)')
      .order('created_at', { ascending: false })

    if (data) {
      setReservations(
        data.map((r) => ({
          ...r,
          items: r.reservation_items ?? [],
        })) as ReservationWithItems[],
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    if (isSupabaseConfigured) {
      supabase
        .from('settings')
        .select('key, value')
        .in('key', ['bank_iban', 'bank_beneficiary'])
        .then(({ data }) => {
          data?.forEach((s) => {
            if (s.key === 'bank_iban') setBankIban(s.value)
            if (s.key === 'bank_beneficiary') setBankBeneficiary(s.value)
          })
        })

      supabase
        .from('bikes')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true })
        .then(({ data }) => setBikes(data ?? []))

      supabase
        .from('bike_variants')
        .select('*')
        .eq('active', true)
        .order('size', { ascending: true })
        .then(({ data }) => setVariants(data ?? []))

      supabase
        .from('discounts')
        .select('*')
        .eq('active', true)
        .then(({ data }) => setDiscounts(data ?? []))
    }
  }, [])

  const availableVariants = form.bikeId ? variants.filter((v) => v.bike_id === form.bikeId) : []
  const selectedBike = bikes.find((b) => b.id === form.bikeId) ?? null
  const selectedVariant = variants.find((v) => v.id === form.variantId) ?? null

  const formDays = form.startDate && form.endDate ? calcDays(form.startDate, form.endDate) : 0
  const formPrice =
    selectedBike && formDays > 0 ? calcPrice(selectedBike.base_price_per_day, formDays, discounts) : null

  async function createReservation(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!form.variantId || !form.startDate || !form.endDate) {
      setFormError('Vyberte kolo a termín (od–do).')
      return
    }
    if (!form.customerName || !form.customerEmail || !form.customerPhone) {
      setFormError('Vyplňte jméno, e-mail a telefon zákazníka.')
      return
    }
    if (form.endDate < form.startDate) {
      setFormError('Konec termínu nemůže být před začátkem.')
      return
    }
    if (!selectedBike || !selectedVariant) {
      setFormError('Kolo nebo varianta nebyla nalezena.')
      return
    }

    setCreating(true)

    const reservationNumber = `BG-${Date.now().toString(36).toUpperCase()}`
    const days = calcDays(form.startDate, form.endDate)
    const price = calcPrice(selectedBike.base_price_per_day, days, discounts)

    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .insert({
        reservation_number: reservationNumber,
        customer_name: form.customerName,
        customer_email: form.customerEmail,
        customer_phone: form.customerPhone,
        customer_address: form.customerAddress,
        start_date: form.startDate,
        end_date: form.endDate,
        status: form.status,
        total_price: price.total,
        discount_amount: price.seasonal_discount + price.multi_day_discount,
        notes: form.notes || null,
      })
      .select()
      .single()

    if (resError || !reservation) {
      setFormError(`Rezervaci se nepodařilo uložit: ${resError?.message ?? 'neznámá chyba'}`)
      setCreating(false)
      return
    }

    const { error: itemsError } = await supabase.from('reservation_items').insert({
      reservation_id: reservation.id,
      bike_variant_id: selectedVariant.id,
      bike_name: selectedBike.name,
      variant_label: `${selectedVariant.color} / ${selectedVariant.size}`,
      price_per_day: selectedBike.base_price_per_day,
      days,
      subtotal: selectedBike.base_price_per_day * days,
    })

    if (itemsError) {
      setFormError(`Rezervaci se nepodařilo uložit: ${itemsError.message}`)
      setCreating(false)
      return
    }

    setFormSuccess(`Rezervace ${reservationNumber} byla vytvořena.`)
    setForm({
      bikeId: '',
      variantId: '',
      startDate: '',
      endDate: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: '',
      notes: '',
      status: 'reserved',
    })
    setCreating(false)
    setShowForm(false)
    load()
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from('reservations').update({ status }).eq('id', id)
    if (!error) {
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: status as Reservation['status'] } : r)),
      )

      // Po potvrzení rezervace (status 'reserved') pošleme klientovi e-mail s QR kódem
      if (status === 'reserved') {
        const r = reservations.find((x) => x.id === id)
        if (r && bankIban) {
          const qrValue = buildQrPaymentString({
            iban: bankIban,
            amount: r.total_price,
            variableSymbol: r.reservation_number.replace(/\D/g, '').slice(0, 10) || '1',
            message: `Rezervace ${r.reservation_number}`,
          })
          const qrSvg = renderToStaticMarkup(<QRCodeSVG value={qrValue} size={200} />)
          await sendEmail({
            to: r.customer_email,
            subject: `Rezervace ${r.reservation_number} — potvrzeno, QR kód na platbu`,
            html: qrEmailHtml({
              reservationNumber: r.reservation_number,
              name: r.customer_name,
              startDate: r.start_date,
              endDate: r.end_date,
              totalPrice: formatPrice(r.total_price),
              qrSvg,
              bankBeneficiary: bankBeneficiary || 'Bike Gallery',
            }),
          })
        }
      }
    }
  }

  const filtered = filter === 'all' ? reservations : reservations.filter((r) => r.status === filter)

  return (
    <div>
      <h1 className="text-2xl font-black text-brand-dark">Rezervace</h1>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {['all', 'pending', 'reserved', 'occupied', 'completed', 'cancelled'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                filter === s ? 'bg-brand-primary text-black' : 'bg-gray-100 text-brand-dark hover:bg-gray-200'
              }`}
            >
              {s === 'all' ? 'Vše' : statusLabels[s]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-brand-primary px-4 py-2 text-sm font-bold text-black"
        >
          {showForm ? 'Skrýt formulář' : '+ Nová rezervace'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={createReservation} className="card mt-6 p-6">
          <h2 className="text-lg font-bold text-brand-dark">Nová rezervace (ručně)</h2>
          <p className="mt-1 text-xs text-gray-500">
            Vytvořte rezervaci ručně — hodí se pro testování a pro zákazníky mimo web.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="new-bike">Kolo *</label>
              <select
                id="new-bike"
                className="input"
                value={form.bikeId}
                onChange={(e) => setForm({ ...form, bikeId: e.target.value, variantId: '' })}
                required
              >
                <option value="">— vyberte kolo —</option>
                {bikes.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="new-variant">Varianta (barva / velikost) *</label>
              <select
                id="new-variant"
                className="input"
                value={form.variantId}
                onChange={(e) => setForm({ ...form, variantId: e.target.value })}
                required
                disabled={!form.bikeId}
              >
                <option value="">— vyberte variantu —</option>
                {availableVariants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.color} / {v.size}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="new-start">Od (datum) *</label>
              <input
                id="new-start"
                type="date"
                className="input"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="new-end">Do (datum) *</label>
              <input
                id="new-end"
                type="date"
                className="input"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="new-name">Jméno a příjmení *</label>
              <input
                id="new-name"
                className="input"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="new-email">E-mail *</label>
              <input
                id="new-email"
                type="email"
                className="input"
                value={form.customerEmail}
                onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="new-phone">Telefon *</label>
              <input
                id="new-phone"
                type="tel"
                className="input"
                value={form.customerPhone}
                onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="new-address">Adresa</label>
              <input
                id="new-address"
                className="input"
                value={form.customerAddress}
                onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="new-status">Status *</label>
              <select
                id="new-status"
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="reserved">Rezervované</option>
                <option value="occupied">Obsazené</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="new-notes">Poznámka</label>
              <input
                id="new-notes"
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          {formPrice && (
            <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">
              <p className="text-gray-600">
                {form.startDate} → {form.endDate} · {formDays} dní ·{' '}
                {formatPrice(selectedBike?.base_price_per_day ?? 0)} / den
              </p>
              {formPrice.seasonal_discount > 0 && (
                <p className="text-green-700">Sezónní sleva: −{formatPrice(formPrice.seasonal_discount)}</p>
              )}
              {formPrice.multi_day_discount > 0 && (
                <p className="text-green-700">Množstevní sleva: −{formatPrice(formPrice.multi_day_discount)}</p>
              )}
              <p className="font-black text-brand-dark">Celkem: {formatPrice(formPrice.total)}</p>
            </div>
          )}

          {formError && (
            <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{formError}</div>
          )}
          {formSuccess && (
            <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{formSuccess}</div>
          )}

          <button
            type="submit"
            disabled={creating}
            className="btn-primary mt-4 w-full disabled:opacity-50"
          >
            {creating ? 'Vytvářám…' : 'Vytvořit rezervaci'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-6 text-gray-500">Načítám…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-gray-500">Žádné rezervace.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-bold text-brand-dark">
                    {r.reservation_number} · {r.customer_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {r.start_date} → {r.end_date} · {formatPrice(r.total_price)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {r.customer_email} · {r.customer_phone}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={r.status}
                    onChange={(e) => updateStatus(r.id, e.target.value)}
                    className={`rounded-md border px-2 py-1.5 text-sm font-semibold ${statusColors[r.status]}`}
                  >
                    {Object.entries(statusLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-brand-dark hover:bg-gray-50"
                  >
                    {expanded === r.id ? 'Skrýt' : 'Detail'}
                  </button>
                </div>
              </div>

              {expanded === r.id && (
                <div className="border-t border-gray-100 p-4">
                  <p className="text-sm text-gray-600">
                    <strong>Adresa:</strong> {r.customer_address || '—'}
                  </p>
                  {r.notes && (
                    <p className="mt-1 text-sm text-gray-600">
                      <strong>Poznámka:</strong> {r.notes}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-gray-600">
                    <strong>Sleva:</strong> {formatPrice(r.discount_amount)}
                  </p>
                  <div className="mt-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Kola</p>
                    {r.items.length === 0 ? (
                      <p className="mt-1 text-sm text-gray-500">Žádné položky.</p>
                    ) : (
                      <ul className="mt-1 space-y-1 text-sm">
                        {r.items.map((item) => (
                          <li key={item.id} className="text-gray-700">
                            {item.bike_name} · {item.variant_label} · {item.days} dní ·{' '}
                            {formatPrice(item.subtotal)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {r.status === 'reserved' && bankIban && (
                    <div className="mt-4 rounded-lg bg-gray-50 p-4">
                      <p className="text-sm font-bold text-brand-dark">QR kód na platbu</p>
                      <p className="mt-1 text-xs text-gray-600">
                        Pošlete klientovi tento QR kód e-mailem. Po připsání platby změňte status
                        na „Obsazené“.
                      </p>
                      <div className="mt-3">
                        <QRCode
                          value={buildQrPaymentString({
                            iban: bankIban,
                            amount: r.total_price,
                            variableSymbol: r.reservation_number.replace(/\D/g, '').slice(0, 10) || '1',
                            message: `Rezervace ${r.reservation_number}`,
                          })}
                        />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Příjemce: {bankBeneficiary || '—'} · Částka: {formatPrice(r.total_price)} ·{' '}
                        VS: {r.reservation_number.replace(/\D/g, '').slice(0, 10) || '1'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}