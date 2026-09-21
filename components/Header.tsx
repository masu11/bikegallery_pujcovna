'use client'

import Link from 'next/link'
import { useState } from 'react'

const navItems = [
  { href: '/', label: 'Úvod' },
  { href: '/galerie', label: 'Galerie kol' },
  { href: '/jak-to-funguje', label: 'Jak to funguje' },
  { href: '/kontakt', label: 'Kontakt' },
]

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded bg-brand-primary text-lg font-black text-black">
            BG
          </span>
          <span className="text-lg font-bold leading-tight text-brand-dark">
            Bike Gallery
            <span className="block text-xs font-semibold uppercase tracking-widest text-brand-secondary">
              Půjčovna gravel kol
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-brand-dark transition-colors hover:text-brand-primary-dark"
            >
              {item.label}
            </Link>
          ))}
          <Link href="/galerie" className="btn-primary">
            Rezervovat kolo
          </Link>
        </nav>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-md text-brand-dark md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="border-t border-gray-200 bg-white md:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-semibold text-brand-dark hover:bg-gray-50"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link href="/galerie" className="btn-primary mt-2" onClick={() => setOpen(false)}>
              Rezervovat kolo
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}