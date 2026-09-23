# Progress

> Přehled hotové a plánované práce.
> Aktualizováno: 2026-09-23

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

## Poslední sezení (23. 9. 2026, noc – 3. úkol, follow-up) ✅

- [x] **Oprava:** Gmail blokuje `data:` URI v obrázcích → QR PNG se nyní **uloží do Supabase Storage** (`bike-photos`, cesta `qr/{reservation_id}.png`, upsert) a v e-mailu se použije **veřejný URL** (funguje ve všech klientoch); fallback data URI → SVG
- [x] **Novinka:** `lib/qrImage.ts` – `base64ToBlob()`; `lib/email.ts` – param `qrPng` → `qrUrl`; `app/admin/rezervace/page.tsx` – upload QR do Storage
- [x] Ověření: `npx tsc --noEmit` bez chyb, `npm run build` OK (17 stránek)

## Předchozí sezení (23. 9. 2026, noc – 3. úkol) ✅

- [x] **Oprava:** QR kód v e-mailu se nezobrazoval → e-mailové klienty nepodporují SVG; nový `lib/qrImage.ts` (`svgToPngDataUri`) převede QR na PNG data URI
- [x] **Novinka:** `lib/email.ts` – `qrEmailHtml` používá `<img>` s PNG; obě šablony (potvrzení požadavku + potvrzení s QR) mají tabulku kol (název, varianta, dny, cena/den, mezisoučet)
- [x] **Novinka:** `app/admin/rezervace/page.tsx` – QR pro e-mail se generuje jako PNG (fallback SVG), posílá items; `app/rezervace/page.tsx` – potvrzovací e-mail posílá items
- [x] Ověření: `npx tsc --noEmit` bez chyb, `npm run build` OK (17 stránek)

## Předchozí sezení (23. 9. 2026, noc – 2. úkol) ✅

- [x] **Oprava:** duplicitní varianty u jednoho kola (87 ks) → nová idempotentní synchronizace v `app/admin/kola/page.tsx` (deduplikace podle barva+velikost, update/insert/skrytí, ochrana před dvojitým klikem)
- [x] **Novinka:** parciální unikátní index `uq_bike_variants_active` na `bike_variants (bike_id, lower(color), lower(size)) WHERE active = true` v `supabase/schema.sql` – DB-level ochrana před duplicitami
- [x] **Novinka:** zlepšený čistící SQL (case-insensitive) + vytvoření indexu v `progress.md`
- [x] Ověření: `npx tsc --noEmit` bez chyb, `npm run build` OK (17 stránek)
- [ ] **Uživatel:** spustit čistící SQL z `progress.md` v Supabase SQL Editor (krok 1 – skrytí duplicit, krok 2 – unikátní index)
- [ ] **Uživatel:** aktualizovat verziu aplikace (nový build / hard refresh Ctrl+F5), aby se nevykonával starý JS

## Předchozí sezení (23. 9. 2026, noc) ✅

- [x] **Oprava:** QR kód v rezervaci nefungoval v mBank → `lib/qr.ts` generoval řetězec mimo standard QR Platby (ČBA): dvojitá hvězdička po `SPD*1.0`, špatný pořadok polí (`AM` před `CC`, `MSG` před `X-VS`), chyběl CRC32 kontrolní součet a závěrečná hvězdička
- [x] **Novinka:** `lib/qr.ts` – správný formát `SPD*1.0*ACC:…*CC:CZK*AM:…*X-VS:…*MSG:…*RN:…*CRC32:…*`, CRC-32 (IEEE 802.3), sanitizace VS, nová funkce `isValidIban()` (mod 97)
- [x] **Novinka:** `app/admin/rezervace/page.tsx` – QR posílá `recipientName` (pole `RN`), varování v detailu, když IBAN je neplatný
- [x] **Oprava:** `tsconfig.json` – doplněn `"target": "es2017"` (chyběl → `tsc` hlásil chybu iterace `Set` v `app/admin/kola/page.tsx`); smazán starý `tsconfig.tsbuildinfo` cache
- [x] Ověření: test CRC32/IBAN v Node.js OK, `npx tsc --noEmit` bez chyb, `npm run build` OK (17 stránek)
- [ ] **Uživatel:** zadat skutečný IBAN v Nastavení (`/admin/nastaveni`) – seed `CZ0000000000000000000000` je neplatný a banka QR kód odmítne

## Předchozí sezení (23. 9. 2026, odpoledne) ✅

- [x] **Oprava:** fotka z lokálního souboru (jpeg/png) se nezobrazovala → chyběl Supabase Storage bucket `bike-photos` a storage RLS politiky
- [x] **Novinka:** `supabase/storage.sql` – vytvoření veřejného bucketu `bike-photos` + politiky (čtení veřejné, nahrávání/úprava/mazání jen admin) – **nutné spustit v Supabase SQL Editor**
- [x] **Oprava:** `app/admin/kola/page.tsx` – sanitizace názvu souboru + `contentType` při uploadu, kontrola chyby při insertu do `photos`, nápověda v UI o bucketu
- [ ] Ověření: `tsc --noEmit` + `npm run build` (v tomto prostředí chybí Node.js/npm – ověřit lokálně)

## Poslední sezení (23. 9. 2026, večer) 🔜

- [x] **Diagnóza:** uživatel přidal obrázek v admin menu, ale nic neviděl na webu ani v Storage → Files → příčina: bucket `bike-photos` neexistuje (storage.sql nespuštěn)
- [x] **Kontrola:** `public.is_admin()` je `security definer` v schema.sql – storage.sql je kompletní a po spuštění bude fungovat
- [ ] **Uživatel spustí** `supabase/storage.sql` v Supabase SQL Editoru a zkusí nahrát fotku znovu
- [ ] Pokud se zobrazí chyba při nahrávání – zkopírovat text chyby a opravit

## Předchozí sezení (23. 9. 2026, dopoledne) ✅

- [x] **Oprava:** RLS chyba při ukládání rezervace → ID se generuje na klientovi, insert bez `.select()` (`app/rezervace/page.tsx`)
- [x] **Oprava:** e-mail "Unexpected token '<'" → kontrola `content-type` + podpora `NEXT_PUBLIC_SEND_EMAIL_URL` (Edge Function) v `lib/email.ts`
- [x] **Oprava:** duplicitní varianty u kola → synchronizace variant (update/insert/skrytí odebraných) v `app/admin/kola/page.tsx`
- [x] **Novinka:** role-based menu v administraci (`app/admin/layout.tsx`) – pracovník vidí jen Přehled a Rezervace
- [x] **Novinka:** bezpečné čtení rezervací pro kalendář přes funkci `get_calendar_reservations()` (SQL v `supabase/schema.sql`, nutné spustit v Supabase)
- [x] **Spuštěn dev server** (`npm run dev`) – aplikace běží na http://localhost:3000/ (HTTP 200, stránky `/`, `/admin/`, `/admin/kola`, `/kolo` kompilují se bez chyb)
- [x] **Pravidlo:** komunikace v chatu vždy jenom česky – zapsáno do `.clinerules`

## Předchozí sezení (22. 9. 2026) ✅

- [x] **Oprava:** kalendář zobrazoval rezervaci pro všechny varianty → nyní per-varianta
- [x] **Oprava:** detail rezervace v administraci → kompletní údaje
- [x] **Novinka:** blokování víkendů a českých státních svátků v kalendáři (automatický výpočet, min. 4 dny na víkend = pátek–pondělí)
- [x] **Oprava:** e-mail nepřicházel → kontrola výsledku + varování + dokumentace
- [x] Ověření: `tsc --noEmit` OK, `npm run build` OK

## Na čem pracujeme / plánováno 🔜

- [ ] **Spustit v Supabase SQL Editor:** `supabase/storage.sql` (bucket `bike-photos` + politiky) – jinak nahrávání lokálních fotek v administraci nefunguje
- [ ] **Spustit v Supabase SQL Editor:** novou funkci `get_calendar_reservations()` (kód v `supabase/schema.sql`) – jinak kalendář pro veřejnost neukáže rezervace
- [ ] **Vyčistit duplicitní varianty v DB** (např. Cannondale Topstone 2) – SQL skript níže
- [ ] **Produkční e-maily:** nasadit Supabase Edge Function `send-email` a nastavit `NEXT_PUBLIC_SEND_EMAIL_URL` (GitHub Pages nepodporuje API route)
- [ ] Ověření vlastní domény v Resend + změna `RESEND_FROM` (aby e-maily chodily na libovolné adresy)
- [ ] (Volitelné) UI v administraci pro ruční blokované dny (`blockedDays` prop je připraven)
- [ ] Commit + push aktuálních změn na GitHub (změny zatím nejsou pushnuté)

### SQL: vyčištění duplicitních variant (spustit v Supabase SQL Editor)

```sql
-- 1) Skryje VŠE duplicitní varianty (stejné kolo + barva + velikost, bez ohledu na velká/malá
--    písmena) kromě JEDNÉ ponechané na skupinu. Ponechaná: ta, která má rezervace (aby se
--    neztratila historie), jinak nejstarší. Historie rezervací zůstane (varianty se jen skryjí).
update public.bike_variants v
set active = false
where v.active
and v.id <> (
  select v2.id
  from public.bike_variants v2
  where v2.bike_id = v.bike_id
    and lower(v2.color) = lower(v.color)
    and lower(v2.size) = lower(v.size)
    and v2.active
  order by
    (exists (select 1 from public.reservation_items ri where ri.bike_variant_id = v2.id)) desc,
    v2.created_at asc,
    v2.id asc
  limit 1
);

-- 2) Potom vytvořit unikátní index na AKTIVNÉ varianty (ochrana před budoucími duplicitami).
create unique index if not exists uq_bike_variants_active
  on public.bike_variants (bike_id, lower(color), lower(size))
  where active = true;
```

## Poznámky / rizika

- **GitHub Pages:** statický export → žádné API routy, žádný server-side kód. E-maily a případné serverové funkce musí běžet jinde.
- **Resend free plán:** `onboarding@resend.dev` doručuje jen na e-mail registrovaný v účtu.
- **RLS:** veřejnost může číst jen aktivní kola/varianty a vkládat rezervace; admin sekce vyžaduje přihlášení.