'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

// Pracovník (worker) má podle RLS přístup jen k rezervacím a přehledu.
// Správa kol, slev a nastavení je vyhrazena administrátorovi (admin).
const navItems = [
  { href: '/admin', label: 'Přehled', roles: ['admin', 'worker'] },
  { href: '/admin/rezervace', label: 'Rezervace', roles: ['admin', 'worker'] },
  { href: '/admin/kola', label: 'Kola', roles: ['admin'] },
  { href: '/admin/slevy', label: 'Slevy', roles: ['admin'] },
  { href: '/admin/nastaveni', label: 'Nastavení', roles: ['admin'] },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)

  useEffect(() => {
    async function check() {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        setRole(data?.role ?? null)
      }
      setLoading(false)
    }
    check()
  }, [])

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setLoginError(null)
    setLoggingIn(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoginError(error.message)
      setLoggingIn(false)
      return
    }
    const {
      data: { session },
    } = await supabase.auth.getSession()
    setUser(session?.user ?? null)
    if (session?.user) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      setRole(data?.role ?? null)
    }
    setLoggingIn(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setRole(null)
  }

  if (loading) {
    return <div className="container-page py-16 text-center text-gray-500">Načítám…</div>
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-black text-brand-dark">Administrace</h1>
        <p className="mt-2 text-gray-600">
          Supabase není nakonfigurován. Nastavte klíče v .env.
        </p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-md rounded-lg border border-gray-200 p-8">
          <h1 className="text-center text-2xl font-black text-brand-dark">Administrace</h1>
          <p className="mt-2 text-center text-gray-600">
            Pro správu rezervací a kol se přihlaste.
          </p>
          <form onSubmit={signIn} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="admin-email">E-mail</label>
              <input
                id="admin-email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="admin-password">Heslo</label>
              <input
                id="admin-password"
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {loginError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{loginError}</div>
            )}
            <button type="submit" disabled={loggingIn} className="btn-primary w-full">
              {loggingIn ? 'Přihlašuji…' : 'Přihlásit se'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!role) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-black text-brand-dark">Nemáte přístup</h1>
        <p className="mt-2 text-gray-600">
          Váš účet nemá oprávnění pro administraci. Kontaktujte správce systému.
        </p>
        <button type="button" onClick={signOut} className="btn-dark mt-6">
          Odhlásit se
        </button>
      </div>
    )
  }

  return (
    <div className="container-page py-8">
      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="shrink-0 md:w-56">
          <div className="mb-4 rounded-lg bg-brand-dark p-4 text-white">
            <p className="text-sm font-bold">{user.email}</p>
            <p className="text-xs text-gray-300">
              Role: {role === 'admin' ? 'Administrátor' : 'Pracovník'}
            </p>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems
              .filter((item) => item.roles.includes(role ?? ''))
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                    pathname === item.href
                      ? 'bg-brand-primary text-black'
                      : 'text-brand-dark hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            <button
              type="button"
              onClick={signOut}
              className="mt-4 rounded-md px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Odhlásit se
            </button>
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}