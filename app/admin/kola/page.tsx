'use client'

import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured, formatPrice } from '@/lib/supabase'
import type { Bike, BikeVariant, BikePhoto } from '@/lib/types'

interface BikeFull extends Bike {
  variants: BikeVariant[]
  photos: BikePhoto[]
}

const emptyForm = {
  name: '',
  brand: '',
  slug: '',
  short_description: '',
  long_description: '',
  base_price_per_day: 0,
  active: true,
}

export default function AdminBikes() {
  const [bikes, setBikes] = useState<BikeFull[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<BikeFull | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [variants, setVariants] = useState<{ id?: string; color: string; size: string }[]>([])
  const [photoUrl, setPhotoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    if (!isSupabaseConfigured) return
    const { data } = await supabase
      .from('bikes')
      .select('*, bike_variants(*), photos(*)')
      .order('sort_order', { ascending: true })

    if (data) {
      setBikes(
        data.map((b) => ({
          ...b,
          // Skryté varianty (active = false) se v administraci nezobrazují
          variants: (b.bike_variants ?? []).filter((v: BikeVariant) => v.active),
          photos: b.photos ?? [],
        })) as BikeFull[],
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function startNew() {
    setIsNew(true)
    setEditing(null)
    setForm(emptyForm)
    setVariants([])
    setPhotoUrl('')
    setMessage(null)
  }

  function startEdit(bike: BikeFull) {
    setIsNew(false)
    setEditing(bike)
    setForm({
      name: bike.name,
      brand: bike.brand,
      slug: bike.slug,
      short_description: bike.short_description,
      long_description: bike.long_description,
      base_price_per_day: bike.base_price_per_day,
      active: bike.active,
    })
    setVariants(bike.variants.map((v) => ({ id: v.id, color: v.color, size: v.size })))
    setPhotoUrl('')
    setMessage(null)
  }

  function cancel() {
    setEditing(null)
    setIsNew(false)
  }

  async function handleSave() {
    if (!form.name || !form.slug) {
      setMessage('Vyplňte název a slug.')
      return
    }
    setSaving(true)
    setMessage(null)

    const payload = {
      name: form.name,
      brand: form.brand,
      slug: form.slug,
      short_description: form.short_description,
      long_description: form.long_description,
      base_price_per_day: Number(form.base_price_per_day),
      active: form.active,
    }

    let bikeId: string | null = editing?.id ?? null

    if (isNew) {
      const { data, error } = await supabase
        .from('bikes')
        .insert({ ...payload, sort_order: bikes.length + 1 })
        .select()
        .single()
      if (error) {
        setMessage(`Chyba: ${error.message}`)
        setSaving(false)
        return
      }
      bikeId = data.id
    } else if (editing) {
      const { error } = await supabase.from('bikes').update(payload).eq('id', editing.id)
      if (error) {
        setMessage(`Chyba: ${error.message}`)
        setSaving(false)
        return
      }
      bikeId = editing.id
    }

    if (bikeId) {
      // Varianty: synchronizace (update existujících, insert nových, skrytí odebraných).
      // POZOR: variantu, na kterou odkazuje rezervace (reservation_items), nelze smazat
      // (FK bez ON DELETE CASCADE) – proto ji místo smazání skryjeme (active = false).
      const { data: existingVariants } = await supabase
        .from('bike_variants')
        .select('id')
        .eq('bike_id', bikeId)
      const existingIds = new Set((existingVariants ?? []).map((v) => v.id))
      const formIds = new Set(variants.filter((v) => v.id).map((v) => v.id))

      for (const v of variants) {
        if (v.id) {
          await supabase
            .from('bike_variants')
            .update({ color: v.color, size: v.size, active: true })
            .eq('id', v.id)
        }
      }

      const newVariants = variants.filter((v) => !v.id)
      if (newVariants.length > 0) {
        await supabase.from('bike_variants').insert(
          newVariants.map((v) => ({ bike_id: bikeId, color: v.color, size: v.size, active: true })),
        )
      }

      for (const id of existingIds) {
        if (!formIds.has(id)) {
          const { error } = await supabase.from('bike_variants').delete().eq('id', id)
          if (error) {
            await supabase.from('bike_variants').update({ active: false }).eq('id', id)
          }
        }
      }

      // Fotka: pokud je URL, vložíme jako hlavní
      if (photoUrl) {
        const { error: photoError } = await supabase.from('photos').insert({
          bike_id: bikeId,
          url: photoUrl,
          alt: form.name,
          is_main: true,
          sort_order: 0,
        })
        if (photoError) {
          setMessage(`Kolo uloženo, ale fotku se nepodařilo uložit: ${photoError.message}`)
          setSaving(false)
          cancel()
          load()
          return
        }
      }
    }

    setSaving(false)
    setMessage('Uloženo.')
    cancel()
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Opravdu smazat toto kolo?')) return
    const { error } = await supabase.from('bikes').delete().eq('id', id)
    if (!error) load()
  }

  if (loading) {
    return <p className="text-gray-500">Načítám…</p>
  }

  if (editing || isNew) {
    return (
      <div>
        <h1 className="text-2xl font-black text-brand-dark">
          {isNew ? 'Nové kolo' : 'Upravit kolo'}
        </h1>

        {message && (
          <div className="mt-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">{message}</div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-lg font-bold text-brand-dark">Základní údaje</h2>
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
                <label className="label">Značka</label>
                <input
                  className="input"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Slug (URL) *</label>
                <input
                  className="input"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="napr. cannondale-topstone-2"
                />
              </div>
              <div>
                <label className="label">Cena za den (Kč) *</label>
                <input
                  type="number"
                  className="input"
                  value={form.base_price_per_day}
                  onChange={(e) =>
                    setForm({ ...form, base_price_per_day: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="label">Krátký popis</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.short_description}
                  onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Rozšířený popis</label>
                <textarea
                  className="input"
                  rows={4}
                  value={form.long_description}
                  onChange={(e) => setForm({ ...form, long_description: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-brand-dark">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Aktivní (zobrazovat v galerii)
              </label>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-bold text-brand-dark">Varianty (barva / velikost)</h2>
              <div className="mt-4 space-y-2">
                {variants.map((v, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="input"
                      placeholder="Barva"
                      value={v.color}
                      onChange={(e) => {
                        const next = [...variants]
                        next[i] = { ...next[i], color: e.target.value }
                        setVariants(next)
                      }}
                    />
                    <input
                      className="input"
                      placeholder="Velikost"
                      value={v.size}
                      onChange={(e) => {
                        const next = [...variants]
                        next[i] = { ...next[i], size: e.target.value }
                        setVariants(next)
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}
                      className="shrink-0 rounded-md border border-red-200 px-3 text-red-600 hover:bg-red-50"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setVariants([...variants, { color: '', size: '' }])}
                  className="btn-outline mt-2 w-full"
                >
                  + Přidat variantu
                </button>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-bold text-brand-dark">Fotka</h2>
              <p className="mt-1 text-xs text-gray-500">
                Vložte URL fotky (např. z bikegallery.cz) nebo nahrajte soubor.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Nahrávání souborů vyžaduje bucket „bike-photos“ v Supabase Storage –
                spusťte SQL z <code>supabase/storage.sql</code>.
              </p>
              <input
                className="input mt-3"
                placeholder="https://…/fotka.jpg"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
              />
              <input
                type="file"
                accept="image/*"
                className="mt-3 block w-full text-sm text-gray-600"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  // Bezpečný název souboru: bez diakritiky, mezer a speciálních znaků
                  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
                  const base = file.name
                    .replace(/\.[^.]+$/, '')
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-zA-Z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '')
                    .toLowerCase()
                  const path = `bikes/${Date.now()}-${base || 'foto'}.${ext}`
                  const { error } = await supabase.storage
                    .from('bike-photos')
                    .upload(path, file, { contentType: file.type })
                  if (error) {
                    setMessage(`Nahrání selhalo: ${error.message}`)
                    return
                  }
                  const { data: urlData } = supabase.storage
                    .from('bike-photos')
                    .getPublicUrl(path)
                  setPhotoUrl(urlData.publicUrl)
                  setMessage('Fotka nahrána.')
                }}
              />
              {photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt="Náhled"
                  className="mt-3 aspect-[4/3] w-full rounded object-cover"
                />
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Ukládám…' : 'Uložit'}
          </button>
          <button type="button" onClick={cancel} className="btn-outline">
            Zrušit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-brand-dark">Kola</h1>
        <button type="button" onClick={startNew} className="btn-primary">
          + Nové kolo
        </button>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
              <th className="py-2 pr-4">Kolo</th>
              <th className="py-2 pr-4">Cena/den</th>
              <th className="py-2 pr-4">Varianty</th>
              <th className="py-2 pr-4">Aktivní</th>
              <th className="py-2">Akce</th>
            </tr>
          </thead>
          <tbody>
            {bikes.map((b) => (
              <tr key={b.id} className="border-b border-gray-100">
                <td className="py-2 pr-4">
                  <p className="font-semibold text-brand-dark">{b.name}</p>
                  <p className="text-xs text-gray-500">{b.brand}</p>
                </td>
                <td className="py-2 pr-4">{formatPrice(b.base_price_per_day)}</td>
                <td className="py-2 pr-4">{b.variants.length}</td>
                <td className="py-2 pr-4">
                  {b.active ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                      Ano
                    </span>
                  ) : (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                      Ne
                    </span>
                  )}
                </td>
                <td className="py-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(b)}
                      className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-brand-dark hover:bg-gray-50"
                    >
                      Upravit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(b.id)}
                      className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Smazat
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}