'use client'

import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Discount } from '@/lib/types'

const emptyForm = {
  name: '',
  type: 'multi_day' as 'seasonal' | 'multi_day',
  value: 0,
  start_date: '',
  end_date: '',
  min_days: '',
  active: true,
}

export default function AdminDiscounts() {
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    if (!isSupabaseConfigured) return
    const { data } = await supabase.from('discounts').select('*').order('created_at')
    setDiscounts(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function startEdit(d: Discount) {
    setEditingId(d.id)
    setForm({
      name: d.name,
      type: d.type,
      value: d.value,
      start_date: d.start_date ?? '',
      end_date: d.end_date ?? '',
      min_days: d.min_days?.toString() ?? '',
      active: d.active,
    })
  }

  function reset() {
    setEditingId(null)
    setForm(emptyForm)
    setMessage(null)
  }

  async function handleSave() {
    if (!form.name) {
      setMessage('Vyplňte název slevy.')
      return
    }
    const payload = {
      name: form.name,
      type: form.type,
      value: Number(form.value),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      min_days: form.min_days ? Number(form.min_days) : null,
      active: form.active,
    }

    if (editingId) {
      const { error } = await supabase.from('discounts').update(payload).eq('id', editingId)
      if (error) {
        setMessage(`Chyba: ${error.message}`)
        return
      }
    } else {
      const { error } = await supabase.from('discounts').insert(payload)
      if (error) {
        setMessage(`Chyba: ${error.message}`)
        return
      }
    }
    setMessage('Uloženo.')
    reset()
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Opravdu smazat slevu?')) return
    await supabase.from('discounts').delete().eq('id', id)
    load()
  }

  if (loading) {
    return <p className="text-gray-500">Načítám…</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-brand-dark">Slevy</h1>
      <p className="mt-1 text-sm text-gray-600">
        Množstevní slevy (3+ dní, 7+ dní) a sezónní slevy (datumové rozsahy).
      </p>

      {message && (
        <div className="mt-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">{message}</div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-brand-dark">
            {editingId ? 'Upravit slevu' : 'Nová sleva'}
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="label">Název *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Typ</label>
              <select
                className="input"
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as 'seasonal' | 'multi_day' })
                }
              >
                <option value="multi_day">Množstevní (dle počtu dní)</option>
                <option value="seasonal">Sezónní (dle data)</option>
              </select>
            </div>
            <div>
              <label className="label">Sleva (%) *</label>
              <input
                type="number"
                className="input"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
              />
            </div>
            {form.type === 'multi_day' ? (
              <div>
                <label className="label">Minimální počet dní</label>
                <input
                  type="number"
                  className="input"
                  value={form.min_days}
                  onChange={(e) => setForm({ ...form, min_days: e.target.value })}
                  placeholder="např. 3"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Od</label>
                  <input
                    type="date"
                    className="input"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Do</label>
                  <input
                    type="date"
                    className="input"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 text-sm font-semibold text-brand-dark">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Aktivní
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={handleSave} className="btn-primary">
                Uložit
              </button>
              {editingId && (
                <button type="button" onClick={reset} className="btn-outline">
                  Zrušit
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-brand-dark">Aktuální slevy</h2>
          {discounts.length === 0 ? (
            <p className="mt-4 text-gray-500">Žádné slevy.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {discounts.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-md border border-gray-100 p-3"
                >
                  <div>
                    <p className="font-semibold text-brand-dark">{d.name}</p>
                    <p className="text-xs text-gray-500">
                      {d.type === 'multi_day'
                        ? `${d.min_days ?? '?'}+ dní`
                        : `${d.start_date ?? '…'} → ${d.end_date ?? '…'}`}{' '}
                      · {d.value}% {d.active ? '' : '(neaktivní)'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(d)}
                      className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-brand-dark hover:bg-gray-50"
                    >
                      Upravit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(d.id)}
                      className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Smazat
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}