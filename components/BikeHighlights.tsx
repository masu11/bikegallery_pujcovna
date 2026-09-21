'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Bike, BikePhoto, BikeVariant } from '@/lib/types'
import BikeCard from './BikeCard'

interface BikeWithMeta extends Bike {
  main_photo: string | null
  variant_count: number
}

export default function BikeHighlights() {
  const [bikes, setBikes] = useState<BikeWithMeta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }
      const { data: bikesData, error } = await supabase
        .from('bikes')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .limit(6)

      if (error || !bikesData) {
        setLoading(false)
        return
      }

      const bikeIds = bikesData.map((b: Bike) => b.id)

      const [photosRes, variantsRes] = await Promise.all([
        supabase
          .from('photos')
          .select('bike_id, url')
          .in('bike_id', bikeIds)
          .eq('is_main', true),
        supabase
          .from('bike_variants')
          .select('bike_id')
          .in('bike_id', bikeIds)
          .eq('active', true),
      ])

      const photoMap = new Map<string, string>()
      photosRes.data?.forEach((p: { bike_id: string; url: string }) => {
        if (!photoMap.has(p.bike_id)) photoMap.set(p.bike_id, p.url)
      })

      const variantCount = new Map<string, number>()
      variantsRes.data?.forEach((v: { bike_id: string }) => {
        variantCount.set(v.bike_id, (variantCount.get(v.bike_id) ?? 0) + 1)
      })

      setBikes(
        bikesData.map((b: Bike) => ({
          ...b,
          main_photo: photoMap.get(b.id) ?? null,
          variant_count: variantCount.get(b.id) ?? 0,
        })),
      )
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card h-72 animate-pulse bg-gray-100" />
        ))}
      </div>
    )
  }

  if (bikes.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-10 text-center">
        <p className="text-gray-600">Nabídka kol se připravuje.</p>
        {!isSupabaseConfigured && (
          <p className="mt-2 text-sm text-gray-500">
            Pro zobrazení kol je potřeba nastavit Supabase (viz .env.example).
          </p>
        )}
        <Link href="/galerie" className="btn-primary mt-4">
          Přejít do galerie
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {bikes.map((bike) => (
        <BikeCard
          key={bike.id}
          bike={bike}
          photoUrl={bike.main_photo}
          variantCount={bike.variant_count}
        />
      ))}
    </div>
  )
}