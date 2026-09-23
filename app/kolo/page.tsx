'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, isSupabaseConfigured, formatPrice } from '@/lib/supabase'
import type { Bike, BikePhoto, BikeVariant, Discount } from '@/lib/types'
import BikeCalendar, { type CalendarReservation } from '@/components/BikeCalendar'
import { calcDays, calcPrice } from '@/lib/pricing'
import { addToCart } from '@/lib/cart'

function BikeDetailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug')

  const [bike, setBike] = useState<Bike | null>(null)
  const [photos, setPhotos] = useState<BikePhoto[]>([])
  const [variants, setVariants] = useState<BikeVariant[]>([])
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [reservations, setReservations] = useState<CalendarReservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [selectedStart, setSelectedStart] = useState<string | null>(null)
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    async function load() {
      if (!slug) {
        setLoading(false)
        return
      }
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }

      const { data: bikeData, error: bikeError } = await supabase
        .from('bikes')
        .select('*')
        .eq('slug', slug)
        .eq('active', true)
        .single()

      if (bikeError || !bikeData) {
        setError('Kolo nebylo nalezeno.')
        setLoading(false)
        return
      }
      setBike(bikeData)

      const [photosRes, variantsRes, discountsRes, reservationsRes] = await Promise.all([
        supabase
          .from('photos')
          .select('*')
          .eq('bike_id', bikeData.id)
          .order('sort_order', { ascending: true }),
        supabase
          .from('bike_variants')
          .select('*')
          .eq('bike_id', bikeData.id)
          .eq('active', true)
          .order('size', { ascending: true }),
        supabase.from('discounts').select('*').eq('active', true),
        // Bezpečné čtení rezervací pro kalendář (veřejnost nemá SELECT na reservations,
        // proto se používá security definer funkce get_calendar_reservations).
        supabase.rpc('get_calendar_reservations'),
      ])

      setPhotos(photosRes.data ?? [])
      setVariants(variantsRes.data ?? [])
      setDiscounts(discountsRes.data ?? [])

      const variantIds = new Set((variantsRes.data ?? []).map((v: BikeVariant) => v.id))
      const cal: CalendarReservation[] = ((reservationsRes.data ?? []) as {
        start_date: string
        end_date: string
        status: string
        bike_variant_id: string
      }[])
        .filter((r) => variantIds.has(r.bike_variant_id))
        .map((r) => ({
          start_date: r.start_date,
          end_date: r.end_date,
          status: r.status as 'pending' | 'reserved' | 'occupied',
          bike_variant_id: r.bike_variant_id,
        }))
      setReservations(cal)

      if (variantsRes.data && variantsRes.data.length > 0) {
        setSelectedVariantId(variantsRes.data[0].id)
      }
      setLoading(false)
    }
    load()
  }, [slug])

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? null,
    [variants, selectedVariantId],
  )

  // Rezervace pouze pro vybranou variantu (každá varianta má vlastní kalendář)
  const variantReservations = useMemo(
    () => reservations.filter((r) => !r.bike_variant_id || r.bike_variant_id === selectedVariantId),
    [reservations, selectedVariantId],
  )

  const days = useMemo(() => {
    if (!selectedStart || !selectedEnd) return 0
    return calcDays(selectedStart, selectedEnd)
  }, [selectedStart, selectedEnd])

  const price = useMemo(() => {
    if (!bike || days === 0) return null
    return calcPrice(bike.base_price_per_day, days, discounts)
  }, [bike, days, discounts])

  const mainPhoto = photos.find((p) => p.is_main) ?? photos[0]

  function handleAddToCart() {
    if (!bike || !selectedVariant || !selectedStart || !selectedEnd || !price) return
    setAdding(true)
    addToCart({
      variant_id: selectedVariant.id,
      bike_name: bike.name,
      variant_label: `${selectedVariant.color} / ${selectedVariant.size}`,
      color: selectedVariant.color,
      size: selectedVariant.size,
      price_per_day: bike.base_price_per_day,
      start_date: selectedStart,
      end_date: selectedEnd,
      days,
    })
    router.push('/rezervace')
  }

  if (loading) {
    return (
      <div className="container-page py-12">
        <div className="h-96 animate-pulse rounded-lg bg-gray-100" />
      </div>
    )
  }

  if (error || !bike) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-black text-brand-dark">Kolo nebylo nalezeno</h1>
        <p className="mt-2 text-gray-600">{error ?? 'Zkuste to prosím znovu.'}</p>
        <Link href="/galerie" className="btn-primary mt-6">
          Zpět do galerie
        </Link>
      </div>
    )
  }

  return (
    <div className="container-page py-12">
      <Link href="/galerie" className="text-sm font-semibold text-brand-secondary hover:underline">
        ← Zpět do galerie
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        {/* Fotky */}
        <div>
          <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-100">
            {mainPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mainPhoto.url}
                alt={mainPhoto.alt || bike.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-brand-primary/20 text-brand-dark">
                <span className="text-6xl font-black">BG</span>
              </div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={p.id}
                  src={p.url}
                  alt={p.alt || bike.name}
                  className="aspect-[4/3] w-full rounded object-cover"
                />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-brand-secondary">
            {bike.brand}
          </p>
          <h1 className="mt-1 text-3xl font-black text-brand-dark">{bike.name}</h1>
          <p className="mt-3 text-gray-600">{bike.long_description || bike.short_description}</p>

          <div className="mt-4 rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">Cena za den</p>
            <p className="text-3xl font-black text-brand-dark">
              {formatPrice(bike.base_price_per_day)}
            </p>
          </div>

          {/* Varianty */}
          {variants.length > 0 && (
            <div className="mt-6">
              <p className="label">Vyberte variantu (barva / velikost)</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariantId(v.id)}
                    className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                      selectedVariantId === v.id
                        ? 'border-brand-primary bg-brand-primary text-black'
                        : 'border-gray-300 text-brand-dark hover:border-brand-primary'
                    }`}
                  >
                    {v.color} / {v.size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kalendář */}
          <div className="mt-6 rounded-lg border border-gray-200 p-4">
            <p className="label">Vyberte termín půjčení</p>
            <BikeCalendar
              reservations={variantReservations}
              selectedStart={selectedStart}
              selectedEnd={selectedEnd}
              onSelect={(start, end) => {
                setSelectedStart(start)
                setSelectedEnd(end)
              }}
            />
          </div>

          {/* Shrnutí */}
          {selectedStart && selectedEnd && price && (
            <div className="mt-6 rounded-lg bg-brand-dark p-5 text-white">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {selectedStart} → {selectedEnd} ({days} dní)
                </span>
                <span className="font-bold">{formatPrice(price.base_total)}</span>
              </div>
              {price.seasonal_discount > 0 && (
                <div className="mt-1 flex items-center justify-between text-sm text-gray-300">
                  <span>Sezónní sleva</span>
                  <span>−{formatPrice(price.seasonal_discount)}</span>
                </div>
              )}
              {price.multi_day_discount > 0 && (
                <div className="mt-1 flex items-center justify-between text-sm text-gray-300">
                  <span>Množstevní sleva</span>
                  <span>−{formatPrice(price.multi_day_discount)}</span>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-white/20 pt-3">
                <span className="font-bold">Celkem</span>
                <span className="text-2xl font-black">{formatPrice(price.total)}</span>
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={adding || !selectedVariant}
                className="btn-primary mt-4 w-full disabled:opacity-50"
              >
                {adding ? 'Přidávám…' : 'Pokračovat k rezervaci'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BikeDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-12">
          <div className="h-96 animate-pulse rounded-lg bg-gray-100" />
        </div>
      }
    >
      <BikeDetailContent />
    </Suspense>
  )
}