export type ReservationStatus =
  | 'pending'
  | 'reserved'
  | 'occupied'
  | 'completed'
  | 'cancelled'

export type AdminRole = 'admin' | 'worker'

export interface Bike {
  id: string
  slug: string
  name: string
  brand: string
  short_description: string
  long_description: string
  base_price_per_day: number
  active: boolean
  sort_order: number
  created_at: string
}

export interface BikeVariant {
  id: string
  bike_id: string
  color: string
  size: string
  photo_url: string | null
  active: boolean
}

export interface BikePhoto {
  id: string
  bike_id: string
  url: string
  alt: string
  is_main: boolean
  sort_order: number
}

export interface Reservation {
  id: string
  reservation_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_address: string
  start_date: string
  end_date: string
  status: ReservationStatus
  total_price: number
  discount_amount: number
  notes: string | null
  created_at: string
}

export interface ReservationItem {
  id: string
  reservation_id: string
  bike_variant_id: string
  bike_name: string
  variant_label: string
  price_per_day: number
  days: number
  subtotal: number
}

export interface Discount {
  id: string
  name: string
  type: 'seasonal' | 'multi_day'
  value: number
  start_date: string | null
  end_date: string | null
  min_days: number | null
  active: boolean
}

export interface CartItem {
  variant_id: string
  bike_name: string
  variant_label: string
  color: string
  size: string
  price_per_day: number
  start_date: string
  end_date: string
  days: number
}
