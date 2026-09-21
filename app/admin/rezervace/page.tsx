'use client'

import { useEffect, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QRCodeSVG } from 'qrcode.react'
import { supabase, isSupabaseConfigured, formatPrice } from '@/lib/supabase'
import type { Reservation, ReservationItem } from '@/lib/types'
import QRCode from '@/components/QRCode'
import { buildQrPaymentString } from '@/lib/qr'
import { sendEmail, qrEmailHtml } from '@/lib/email'

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
    }
  }, [])

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

      <div className="mt-4 flex flex-wrap gap-2">
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