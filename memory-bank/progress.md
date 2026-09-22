# Progress

> Přehled hotové a plánované práce.
> Aktualizováno: 2026-09-22

## Hotovo ✅

### Základ projektu
- [x] Next.js 14 + TypeScript + Tailwind – struktura projektu
- [x] Supabase schéma (`supabase/schema.sql`): bikes, bike_variants, photos, reservations, reservation_items, discounts, settings, profiles
- [x] RLS politiky + role admin/worker
- [x] Seed data (slevy, bankovní údaje)
- [x] GitHub Actions deploy na GitHub Pages (`basePath`/`assetPrefix` v `next.config.mjs`)

### Veřejná část
- [x] Úvodní stránka, galerie kol, detail kola (`/kolo?slug=...`)
- [x] Výběr varianty (barva / velikost) + termínu v kalendáři
- [x] Košík + rezervační formulář (`/rezervace`)
- [x] Výpočet ceny se slevami (sezónní + množstevní) – `lib/pricing.ts`
- [x] Stránky: jak-to-funguje, kontakt, obchodní podmínky, ochrana osobních údajů

### Administrace
- [x] Přihlášení (Supabase Auth) + ochrana admin sekce
- [x] Správa kol, variant, slev, nastavení
- [x] Seznam rezervací + změna statusu + QR kód na platbu
- [x] Ruční vytvoření rezervace

### E-mail
- [x] API route `/api/send-email` (Resend) – funguje lokálně
- [x] Potvrzovací e-mail klientovi po odeslání rezervace
- [x] E-mail s QR kódem po potvrzení rezervace (status `reserved`)
- [x] Kontrola výsledku odeslání + varování v UI (veřejná i admin část)
- [x] Dokumentace omezení `onboarding@resend.dev` v `.env` / `.env.example`
- [x] Supabase Edge Function `send-email` (připravená, nenasazená)

## Poslední sezení (22. 9. 2026) ✅

- [x] **Oprava:** kalendář zobrazoval rezervaci pro všechny varianty → nyní per-varianta
- [x] **Oprava:** detail rezervace v administraci → kompletní údaje
- [x] **Novinka:** blokování víkendů a českých státních svátků v kalendáři (automatický výpočet, min. 4 dny na víkend = pátek–pondělí)
- [x] **Oprava:** e-mail nepřicházel → kontrola výsledku + varování + dokumentace
- [x] Ověření: `tsc --noEmit` OK, `npm run build` OK

## Na čem pracujeme / plánováno 🔜

- [ ] Rozhodnutí o produkčním hostingu e-mailů (GitHub Pages nepodporuje API route)
  - Varianta A: Vercel / Netlify (server-side)
  - Varianta B: Supabase Edge Function `send-email` + přesměrování odesílání
- [ ] Ověření vlastní domény v Resend + změna `RESEND_FROM` (aby e-maily chodily na libovolné adresy)
- [ ] (Volitelné) UI v administraci pro ruční blokované dny (`blockedDays` prop je připraven)
- [ ] Commit + push aktuálních změn na GitHub (změny zatím nejsou pushnuté)

## Poznámky / rizika

- **GitHub Pages:** statický export → žádné API routy, žádný server-side kód. E-maily a případné serverové funkce musí běžet jinde.
- **Resend free plán:** `onboarding@resend.dev` doručuje jen na e-mail registrovaný v účtu.
- **RLS:** veřejnost může číst jen aktivní kola/varianty a vkládat rezervace; admin sekce vyžaduje přihlášení.