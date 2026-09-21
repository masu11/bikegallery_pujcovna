'use client'

import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    if (!isSupabaseConfigured) return
    const { data } = await supabase.from('settings').select('key, value')
    const map: Record<string, string> = {}
    data?.forEach((s) => {
      map[s.key] = s.value
    })
    setSettings(map)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from('settings').upsert({ key, value })
    }
    setSaving(false)
    setMessage('Nastavení uloženo.')
  }

  if (loading) {
    return <p className="text-gray-500">Načítám…</p>
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-brand-dark">Nastavení</h1>

      {message && (
        <div className="mt-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">{message}</div>
      )}

      <div className="mt-6 max-w-xl space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-bold text-brand-dark">Rezervace</h2>
          <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-brand-dark">
            <input
              type="checkbox"
              checked={settings.require_admin_confirmation === 'true'}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  require_admin_confirmation: e.target.checked ? 'true' : 'false',
                })
              }
            />
            Administrátor musí potvrdit rezervaci (jinak se potvrdí automaticky)
          </label>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-bold text-brand-dark">Bankovní údaje pro QR platbu</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="label">Číslo účtu (formát 123456789/0100)</label>
              <input
                className="input"
                value={settings.bank_account ?? ''}
                onChange={(e) => setSettings({ ...settings, bank_account: e.target.value })}
              />
            </div>
            <div>
              <label className="label">IBAN</label>
              <input
                className="input"
                value={settings.bank_iban ?? ''}
                onChange={(e) => setSettings({ ...settings, bank_iban: e.target.value })}
              />
            </div>
            <div>
              <label className="label">SWIFT/BIC</label>
              <input
                className="input"
                value={settings.bank_swift ?? ''}
                onChange={(e) => setSettings({ ...settings, bank_swift: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Příjemce platby</label>
              <input
                className="input"
                value={settings.bank_beneficiary ?? ''}
                onChange={(e) => setSettings({ ...settings, bank_beneficiary: e.target.value })}
              />
            </div>
          </div>
        </div>

        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Ukládám…' : 'Uložit nastavení'}
        </button>
      </div>
    </div>
  )
}