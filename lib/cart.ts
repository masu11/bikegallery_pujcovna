import type { CartItem } from './types'

const CART_KEY = 'bg_cart'

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
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