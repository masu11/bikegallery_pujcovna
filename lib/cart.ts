import type { CartItem } from './types'

const CART_KEY = 'bg_cart'

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartItem[]
    // Ochrana před starou/poškozenou datou v localStorage: odeber položky
    // s neplatnými cenami/dny (jinak by se do DB poslal null/NaN).
    const valid = parsed.filter(
      (it) =>
        it &&
        Number.isFinite(it.price_per_day) &&
        Number.isFinite(it.days) &&
        typeof it.variant_id === 'string' &&
        typeof it.start_date === 'string' &&
        typeof it.end_date === 'string',
    )
    if (valid.length !== parsed.length) saveCart(valid)
    return valid
  } catch {
    return []
  }
}

export function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}

export function addToCart(item: CartItem) {
  const cart = getCart()
  cart.push(item)
  saveCart(cart)
}

export function removeFromCart(index: number) {
  const cart = getCart()
  cart.splice(index, 1)
  saveCart(cart)
}

export function clearCart() {
  saveCart([])
}

export function cartCount(): number {
  return getCart().length
}