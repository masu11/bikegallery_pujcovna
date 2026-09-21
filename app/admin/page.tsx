'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, isSupabaseConfigured, formatPrice } from '@/lib/supabase'
import type { Reservation } from '@/lib/types'

export default function AdminDashboard() {
  const [stats, setStats] = useState<Record<string, number>>({})
  const [upcoming, setUpcoming] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured) return
      const { data } = await supabase
        .from('reservations')
        .select('*')
        .order('start_date', { ascending: true })

      if (!data) {
        setLoading(false)
        return
      }

      const counts: Record<string, number> = {}
      for (const r of data) {
        counts[r.status] = (counts[r.status] ?? 0) + 1
      }
      setStats(counts)

      const today = new Date().toISOString().slice(0, 10)
      setUpcoming(
        data
          .filter((r) => r.end_date >= today && r.status !== 'cancelled')
          .slice(0, 5),
      )
      setLoading(false)
    }
    load()
  }, [])

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

  if (loading) {
    return <div className="text-gray-500">Načítám…</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-brand-dark">Přehled</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Object.entries(statusLabels).map(([key, label]) => (
          <div key={key} className="card p-4">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="mt-1 text-3xl font-black text-brand-dark">{stats[key] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-dark">Nadcházející rezervace</h2>
          <Link href="/admin/rezervace" className="text-sm font-semibold text-brand-secondary hover:underline">
            Všechny rezervace →
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <p className="mt-4 text-gray-500">Žádné nadcházející rezervace.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                  <th className="py-2 pr-4">Číslo</th>
                  <th className="py-2 pr-4">Zákazník</th>
                  <th className="py-2 pr-4">Termín</th>
                  <th className="py-2 pr-4">Cena</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-semibold">{r.reservation_number}</td>
                    <td className="py-2 pr-4">{r.customer_name}</td>
                    <td className="py-2 pr-4">
                      {r.start_date} → {r.end_date}
                    </td>
                    <td className="py-2 pr-4">{formatPrice(r.total_price)}</td>
                    <td className="py-2">
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${statusColors[r.status]}`}>
                        {statusLabels[r.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}