import Link from 'next/link'
import type { Bike } from '@/lib/types'
import { formatPrice } from '@/lib/supabase'

interface BikeCardProps {
  bike: Bike
  photoUrl?: string | null
  variantCount: number
}

export default function BikeCard({ bike, photoUrl, variantCount }: BikeCardProps) {
  return (
    <Link
      href={`/kolo?slug=${bike.slug}`}
      className="card group flex flex-col transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={bike.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-brand-primary/20 text-brand-dark">
            <span className="text-4xl font-black">BG</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-secondary">
          {bike.brand}
        </p>
        <h3 className="mt-1 text-lg font-bold leading-snug text-brand-dark">{bike.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{bike.short_description}</p>
        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            <p className="text-xs text-gray-500">od</p>
            <p className="text-xl font-black text-brand-dark">
              {formatPrice(bike.base_price_per_day)}
              <span className="text-sm font-semibold text-gray-500"> / den</span>
            </p>
          </div>
          {variantCount > 0 && (
            <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
              {variantCount}× variant
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}