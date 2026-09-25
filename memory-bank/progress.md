# Progress

> Přehled hotové a plánované práce.
> Aktualizováno: 2026-09-25

## Poslední sezení (25. 9. 2026 – BCC kopie odchozích e-mailů na admin) ✅

- [x] **Požadavek:** všechny odchozí e-maily se mají posílat i na `marcel.suchomnel@gmail.com` (resp. `SMTP_USER`) jako BCC kopie
- [x] **`app/api/send-email/route.ts`:** přidána `adminEmail` (ENV `ADMIN_EMAIL` nebo fallback `SMTP_USER`); BCC v SMTP (Nodemailer) i Resend větvi
- [x] **`supabase/functions/send-email/index.ts`:** stejná logika – `adminEmail` z `ADMIN_EMAIL` nebo `SMTP_USER`; BCC v obou větvích
- [x] **`.env.example`:** nová proměnná `ADMIN_EMAIL=marcel.suchomnel@gmail.com` s vysvětlením (fallback na `SMTP_USER`)
- [x] Ověření: `npx tsc --noEmit` bez chyb
- [ ] **Uživatel:** do `.env` přidat `ADMIN_EMAIL=marcel.suchomnel@gmail.com` a restart dev serveru
- [ ] **Uživatel:** Edge Function → `supabase secrets set ADMIN_EMAIL=marcel.suchomnel@gmail.com` + `supabase functions deploy send-email`

## Poslední sezení (25. 9. 2026 – globální přepínač e-mailů: Resend / Nodemailer SMTP) ✅

- [x] **Požadavek:** testování e-mailů na jiné adresy vedle Resendu (LIVE pod doménou) – Nodemailer
      na Gmail SMTP, s výhledem na SMTP domény bikegallery.cz (ONE.CZ); globální přepínač
      Resend/Nodemailer funkční na local, GH Pages a Vercel
- [x] **Architektura:** `output: 'export'` → statika na GH Pages/Vercel, jediný server-side tok je
      Edge Function (Deno); lokálně API route (Node.js) → přepínač v OBOU místech
- [x] **`app/api/send-email/route.ts`:** `EMAIL_PROVIDER` (resend|smtp) + Nodemailer SMTP větev
      (SMTP_HOST/PORT/SECURE/USER/PASS/FROM)
- [x] **`supabase/functions/send-email/index.ts`:** stejný přepínač s `npm:nodemailer@10.0.10`;
      kontrola RESEND_API_KEY přesunuta do resend větve
- [x] **`.env.example`:** dokumentace EMAIL_PROVIDER + SMTP_* (Gmail: smtp.gmail.com:465 + app password)
- [x] **`package.json`:** nodemailer@^10.0.10 + @types/nodemailer@^8.0.2
- [x] Ověření: `npx tsc --noEmit` bez chyb, `npm run build` OK (17 stránek + API route)
- [x] **Follow-up:** lokální test vracel Resend chybu („verify a domain") – příčina: `NEXT_PUBLIC_SEND_EMAIL_URL`
      bylo nastavené v `.env` → klient posílal na Edge Function (Resend secrets), ne na lokální API route se SMTP;
      oprava: v `.env` zakomentované `NEXT_PUBLIC_SEND_EMAIL_URL` (pro lokální test musí být prázdné)
- [ ] **Uživatel:** restart dev serveru (Next.js čte .env jen při startu) a otestovat rezervaci znovu
- [ ] **Uživatel:** Edge Function → `supabase secrets set EMAIL_PROVIDER=smtp SMTP_*` + `supabase functions deploy send-email`
- [ ] **Uživatel:** (Vercel) env proměnné v dashboardu, pokud tam běží API route
- [ ] **Uživatel:** otestovat rezervaci na local/GH Pages/Vercel – e-mail na libovolnou adresu

## Poslední sezení (25. 9. 2026 – vercel.json: CSP blokoval QR obrázek v e-mailu) ✅

- [x] **Diagnóza:** z Vercelu e-mail s QR dorazí, ale obrázek chybí; z lokálu funguje
- [x] **Příčina:** CSP v `vercel.json` měl `img-src` bez `blob:` → `svgToPngDataUri()` v
      `lib/qrImage.ts` nemohl načíst SVG přes `URL.createObjectURL()` (blob URL) → fallback na SVG
      → e-mailové klienty SVG nerenderují → QR v e-mailu chybí
- [x] **Sekundární konflikt:** `img-src` bez domény Supabase Storage → fotky kol by se na Vercelu
      nezobrazovaly (`BikeCard.tsx` načítá fotky ze Storage)
- [x] **`vercel.json`:** do CSP `img-src` přidáno `blob:` + `https://ihsiyynhvxhcyuqbjlrm.supabase.co`
- [x] Ověření: JSON validní (node parse OK)
- [ ] **Uživatel:** commit + push na `main` (Vercel nasadí nové headers) a otestovat QR e-mail z adminu

## Poslední sezení (25. 9. 2026 – chyba „null value in column total_price" stále na PC) ✅

- [x] **Diagnóza:** chyba přetrvává jen na PC (localhost + GitHub Pages), z mobilu a adminu funguje
- [x] **Ověřeno:** produkční DB má NOVOU funkci `create_reservation` (test RPC s `p_total_price: null`
      vrátil chybu varianty, ne total_price → cena se počítá na serveru, `total_price = 0` nikdy `null`)
- [x] **Ověřeno:** nasazený JS na GitHub Pages je aktuální (volá RPC, posílá `p_total_price` jako číslo,
      kontrola `Number.isFinite` na košík); lokální kód je aktuální (git čistý)
- [x] **Příčina:** prohlížeč na PC běží STARÝ JS (přímé inserty `total_price: totals.total` – commity
      `41007de`/`d9738c6`/`d2f8241`) a/nebo má stará data košíku v localStorage, kde `totals.total` je
      `NaN` → JSON serializuje `NaN` jako `null` → not-null chyba
- [x] **`supabase/schema.sql`:** nový trigger `trg_reservations_coalesce_prices` (funkce
      `reservations_coalesce_prices()`) – `BEFORE INSERT OR UPDATE` na `reservations` převede
      `total_price`/`discount_amount` z `null` na `0` (pojistka proti starým verzím klienta)
- [x] **`lib/cart.ts`:** `getCart()` automaticky odebírá neplatné položky košíku (nečíselné
      `price_per_day`/`days`, chybějící `variant_id`/`start_date`/`end_date`) a ukládá vyčištěný košík
- [x] Ověření: `npx tsc --noEmit` bez chyb
- [x] **Potvrzeno uživatelem ✅:** trigger pomohl – rezervace z klientské části nyní funguje
      (na Vercelu i GitHubu bez nutnosti nového deploye). Chyba „null value in column total_price"
      je vyřešena.
- [ ] **Uživatel:** spustit CELÝ `supabase/schema.sql` v Supabase SQL Editoru (vytvoří trigger)
- [ ] **Uživatel:** commit + push na `main` (GitHub Actions nasadí nový build)
- [ ] **Uživatel:** na PC hard refresh (Ctrl+F5) na GitHub Pages + restart dev serveru + vyčistit košík
      (stará data košíku s `NaN` cenami jsou hlavní spouštěč chyby)

## Poslední sezení (24. 9. 2026 – chyba „null value in column total_price" na GitHubu) ✅

- [x] **Diagnóza:** veřejný formulář na GitHub Pages vrací `null value in column "total_price"` –
      nasazený kód je aktuální (RPC `create_reservation`), RPC v produkční DB funguje (HTTP 200,
      i s `p_total_price: null`); chyba nastává, když do DB se posílá `total_price = null`/`NaN`
      (stará/poškozená data v košíku localStorage nebo starší verze funkce v DB)
- [x] **`app/rezervace/page.tsx`:** kontrola platnosti košíka (`Number.isFinite`), `p_total_price`/
      `p_discount_amount` se posílají vždy jako čísla (fallback `0`)
- [x] **`app/admin/rezervace/page.tsx`:** `total_price`/`discount_amount` při ručním vytvoření
      se posílají vždy jako čísla (fallback `0`)
- [x] Ověření: `npx tsc --noEmit` bez chyb
- [ ] **Uživatel:** spustit CELÝ `supabase/schema.sql` v Supabase SQL Editoru (aktualizuje
      `create_reservation` – cena se počítá na serveru, `total_price = 0` nikdy `null`)
- [ ] **Uživatel:** commit + push na `main` + hard refresh (Ctrl+F5) na GitHub Pages

## Poslední sezení (24. 9. 2026 – oprava bezpečnostních nálezů před LIVE) ✅

- [x] **Ověřeny všechny nálezy** z bezpečnostní analýzy (2× VYSOKÉ, 3× STŘEDNÍ) – potvrzené v kódu
- [x] **VYSOKÉ – manipulace s cenou opravena:** `create_reservation` počítá ceny na serveru z DB
      (`bikes.base_price_per_day` + slevy z `discounts`), ceny od klienta se ignorují;
      nové funkce `seasonal_discount_pct()`, `multi_day_discount_pct()`
- [x] **VYSOKÉ – veřejná Edge Function opravena:** `send-email` vyžaduje `x-send-email-secret`
      (env `SEND_EMAIL_SECRET`), rate limit (per IP + per příjemce), validace e-mailu/délky
- [x] **STŘEDNÍ – HTML injekce opravena:** `lib/email.ts` – nová `escapeHtml()`,
      všechna uživatelská data v šablonách escapovaná
- [x] **STŘEDNÍ – rate limiting přidán:** rezervace (max 5/hod/e-mail v `create_reservation`),
      e-maily (Edge Function + API route)
- [x] **STŘEDNÍ – RLS insert zpřísněn:** `reservations_public_insert` → `to anon with check (status = 'pending')`;
      `items_public_insert` → `to anon with check (reservation_is_pending(...))`;
      nové worker insert politiky pro admin ruční vytvoření
- [x] **Konfigurace:** `.env.example` + `.github/workflows/deploy.yml` – `NEXT_PUBLIC_SEND_EMAIL_SECRET` / `SEND_EMAIL_SECRET`
- [x] Ověření: `npx tsc --noEmit` bez chyb, `npm run build` OK (17 stránek)
- [ ] **Uživatel:** spustit CELÝ `supabase/schema.sql` v Supabase SQL Editoru
- [ ] **Uživatel:** `supabase secrets set SEND_EMAIL_SECRET=...` + `supabase functions deploy send-email`
- [ ] **Uživatel:** do `.env` přidat `SEND_EMAIL_SECRET` + `NEXT_PUBLIC_SEND_EMAIL_SECRET` (stejná hodnota), restart dev serveru
- [ ] **Uživatel:** GitHub secret `NEXT_PUBLIC_SEND_EMAIL_SECRET` + commit/push na `main`

## Poslední sezení (24. 9. 2026 – hosting, údržba, free plány, bezpečnostní analýza) ✅

- [x] **Odpovězeno:** minimální požadavky na webhosting (statický export → statický hosting s HTTPS; server-side vyžaduje Node.js 18+ / Vercel / Netlify)
- [x] **Odpovězeno:** co aktualizovat/udržovat pro bezpečnost (závislosti, 2FA, rotace klíčů, RLS, zálohy, hlavičky, rate limiting)
- [x] **Odpovězeno:** udržitelnost free plánů v LIVE (Supabase + Resend ano pro malý provoz, ale nutná verifikace domény v Resend a pozor na 7denní pauzu Supabase free projektu)
- [x] **Statická bezpečnostní analýza kódu** (live test nešel – Ask mode bez execute_command):
  - [x] Nalezeno VYSOKÉ riziko: manipulace s cenou přes RPC `create_reservation` (ceny od klienta bez kontroly proti DB)
  - [x] Nalezeno VYSOKÉ riziko: veřejná Edge Function `send-email` (kdokoli může posílat e-maily přes Resend)
  - [x] Nalezeno STŘEDNÍ riziko: HTML injekce do e-mailových šablon (neescapovaná uživatelská data)
  - [x] Nalezeno STŘEDNÍ riziko: chybějící rate limiting (rezervace, e-maily, přihlášení)
  - [x] Nalezeno STŘEDNÍ riziko: RLS insert `with check (true)` umožňuje vložit rezervaci se statusem `reserved`/`occupied`
  - [x] Ověřeno OK: RLS čtení jen aktivních položek, `get_calendar_reservations` (omezené sloupce), trigger `trg_prevent_overlap`, storage politiky, `.env` v .gitignore, secrets v GitHub Actions
- [x] **Doporučeno (plán) – OPRAVENO v sezení „oprava bezpečnostních nálezů před LIVE":** manipulace s cenou (serverová validace v `create_reservation`), omezení veřejné Edge Function (tajný klíč + rate limit), escapování dat v e-mailových šablonách, rate limiting, zpřísnění RLS insert (status vždy `pending`)

## Poslední sezení (24. 9. 2026 – uživatelský manuál) ✅

- [x] **Nový soubor `docs/manual.md`** – uživatelský manuál v češtině pro část **zákazník**
      (galerie, detail kola, kalendář, rezervace, platba) a **administrátor** (přihlášení,
      role, přehled, rezervace, kola, slevy, nastavení) + tabulka statusů a důležité poznámky
- [x] Manuál vychází z reálného chování kódu (stránky `app/`, `components/BikeCalendar.tsx`,
      `lib/pricing.ts`, `lib/qr.ts`)
- [x] Žádné změny kódu – pouze dokumentace

## Poslední sezení (24. 9. 2026 – e-mail na GitHub Pages: HTTP 405) ✅

- [x] **Diagnóza:** po deploy na GitHub Pages e-mail nešel (HTTP 405, HTML místo JSON) – `NEXT_PUBLIC_SEND_EMAIL_URL` chyběl v `.github/workflows/deploy.yml`, takže build na GitHub Pages neobsahoval URL Edge Function a `lib/email.ts` volal neexistující API route `/api/send-email/`
- [x] **`.github/workflows/deploy.yml`:** do `env` buildu přidán `NEXT_PUBLIC_SEND_EMAIL_URL: ${{ secrets.NEXT_PUBLIC_SEND_EMAIL_URL }}`
- [x] **`.env.example`:** poznámka, že `NEXT_PUBLIC_SEND_EMAIL_URL` musí být i GitHub Actions secret
- [x] Ověření: `npx tsc --noEmit` bez chyb
- [ ] **Uživatel:** přidat GitHub secret `NEXT_PUBLIC_SEND_EMAIL_URL` = `https://ihsiyynhvxhcyuqbjlrm.supabase.co/functions/v1/send-email` (Settings → Secrets and variables → Actions)
- [ ] **Uživatel:** commit + push na `main` a otestovat rezervaci na GitHub Pages (e-mail jen na `marcel.suchomel@gmail.com` – free plán Resendu)

## Poslední sezení (24. 9. 2026 – datum a čas vytvoření v přehledu rezervací) ✅

- [x] **`app/admin/rezervace/page.tsx`:** v seznamu rezervací se za číslem rezervace zobrazuje datum a čas vytvoření (`created_at`, formát `cs-CZ`), poté jméno zákazníka
- [x] Ověření: `npx tsc --noEmit` bez chyb
- [ ] **Uživatel:** restart dev serveru + hard refresh (Ctrl+F5) a zkontrolovat přehled rezervací

## Poslední sezení (24. 9. 2026 – správa fotek u kol: mazání a pořadí) ✅

- [x] **Diagnóza:** fotky u kol šlo jen přidávat (jeden stav `photoUrl`, vložení jedné hlavní fotky při uložení), neexistovalo mazání ani řazení
- [x] **`app/admin/kola/page.tsx`:** kompletní správa fotek – seznam s náhledy, přidávání více fotek (URL + upload), mazání (z `photos` i ze Storage přes `storagePathFromUrl()`), řazení šipkami ↑/↓ (první fotka = hlavní, `sort_order` + `is_main` se přepíšou při uložení)
- [x] Ověření: `npx tsc --noEmit` bez chyb
- [ ] **Uživatel:** restart dev serveru + hard refresh (Ctrl+F5) a otestovat mazání/řazení fotek

## Poslední sezení (24. 9. 2026 – oprava kalendáře a duplicitních rezervací) ✅

- [x] **Diagnóza:** kalendář neukazoval rezervace, protože chyba RPC `get_calendar_reservations()` se tiše ignorovala; duplicitní rezervace procházely, protože v DB nebyla ochrana proti překryvu termínů
- [x] **`supabase/schema.sql`:** nový trigger `trg_prevent_overlap` (funkce `prevent_overlapping_reservations`) na `reservation_items` – blokuje překryv termínů pro variantu (pending/reserved/occupied)
- [x] **`supabase/schema.sql`:** nová transakční funkce `create_reservation(...)` – rezervace + položky v jedné transakci, kontrola překryvu, žádné osiřelé rezervace
- [x] **`app/rezervace/page.tsx`:** veřejný formulář volá `create_reservation` (RPC) místo dvou insertů
- [x] **`app/admin/rezervace/page.tsx`:** úklid osiřelé rezervace při chybě vložení položek
- [x] **`app/kolo/page.tsx`:** varování u kalendáře, když se nepodaří načíst rezervace (chyba RPC se neignoruje)
- [x] Ověření: `npx tsc --noEmit` bez chyb
- [x] **Oprava chyby 42P13:** z definice `create_reservation(...)` odstraněny defaulty u `p_customer_address` a `p_notes` (PostgreSQL nepovoluje default před parametry bez defaultu) – nutné spustit CELÝ `supabase/schema.sql` znovu
- [ ] **Uživatel:** spustit `supabase/schema.sql` v Supabase SQL Editoru (vytvoří funkce + trigger)
- [ ] **Uživatel:** restart dev serveru + hard refresh (Ctrl+F5)
- [ ] **Uživatel:** duplicitní rezervace v adminu označit jako Stornované (status `cancelled`)

## Předchozí sezení (24. 9. 2026 – Edge Function nasazena) ✅

- [x] **Edge Function `send-email` nasazena** na projekt `ihsiyynhvxhcyuqbjlrm` (Supabase CLI: login, link, secrets set, functions deploy)
- [x] **Ověřeno:** Edge Function vrací HTTP 200 a e-mail se odeslal (s `apikey` hlavičkou); bez ní 401 `UNAUTHORIZED_NO_AUTH_HEADER`
- [x] **Oprava `lib/email.ts`:** `postEmail()` posílá `apikey` hlavičku (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) – anon klíč je veřejný
- [x] Ověření: `npx tsc --noEmit` bez chyb
- [ ] **Uživatel:** restart dev serveru + hard refresh (Ctrl+F5) a otestovat rezervaci
- [ ] **Uživatel:** pro e-maily na jiné adresy ověřit doménu v Resend a změnit `RESEND_FROM`

## Předchozí sezení (24. 9. 2026 – e-mail: skutečná příčina + fallback) ✅

- [x] **Nalezena skutečná příčina:** Edge Function NENÍ nasazená → `NEXT_PUBLIC_SEND_EMAIL_URL` vrací HTTP 404 `NOT_FOUND` → „Failed to fetch"
- [x] **Oprava `lib/email.ts`:** fallback na lokální API route při 404/síťové chybě Edge Function; retry (1× po 1,5 s) při přechodné síťové chybě; `extractError()` pro řetězec i objekt
- [x] **Ověřeno:** lokální route posílá e-mail (HTTP 200, id vráceno); `npx tsc --noEmit` bez chyb
- [x] **Odpověď:** Edge Functions fungují na free tieru Supabase; příklad s `auth: "user"` by nefungoval pro anonymní rezervační formulář (401) – naše funkce bez auth je správná
- [ ] **Uživatel:** nainstalovat Supabase CLI + nasadit Edge Function (`supabase functions deploy send-email`) + nastavit secrets `RESEND_API_KEY`, `RESEND_FROM`
- [ ] **Uživatel:** restart dev serveru + hard refresh (Ctrl+F5)

## Předchozí sezení (24. 9. 2026 – lokální běh, e-mail + admin) ✅

- [x] **Diagnóza e-mailu:** API route `/api/send-email` funguje (test Node fetch: HTTP 500 s reálnou odpovědí Resendu); „TypeError: Failed to fetch" byl přechodný (kompilace route v dev režimu)
- [x] **Oprava:** `lib/email.ts` – default URL `/api/send-email/` (s lomítkem) kvůli `trailingSlash: true` a 308 přesměrování
- [x] **Diagnóza adminu:** „Pro správu rezervací a kol se přihlaste." je přihlašovací formulář (očekávané chování), ne chyba
- [x] Ověření: `npx tsc --noEmit` bez chyb
- [ ] **Uživatel:** testovat e-maily na adresu `marcel.suchomel@gmail.com` (Resend free plán doručuje jen na registrovaný e-mail); pro jiné adresy ověřit doménu v Resend a změnit `RESEND_FROM`
- [ ] **Uživatel:** vytvořit uživatele v Supabase Auth + spustit `supabase/roles.sql` (role admin pro `marcel.suchomel@gmail.com`)

## Předchozí sezení (24. 9. 2026 – nový PC, nastavení .env) ✅

- [x] **Diagnóza:** po stažení z GitHubu chyběl `.env` (je v `.gitignore`, ř. 26) → aplikace hlásila „Supabase není nakonfigurován“
- [x] **Vytvořen `.env`** ze šablony `.env.example` (placeholder hodnoty) – uživatel doplní reálné klíče
- [x] Ověřeno: `node_modules` existuje (závislosti nainstalované)
- [ ] **Uživatel:** doplnit do `.env` `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase Dashboard → Project Settings → API) a restartovat `npm run dev`
- [ ] **Uživatel:** pokud je Supabase projekt nový/prázdný, spustit v SQL Editoru `supabase/schema.sql`, `supabase/seed.sql`, `supabase/storage.sql`

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
- [ ] **Spustit v Supabase SQL Editor:** celý `supabase/schema.sql` (funkce `get_calendar_reservations` + nový trigger `trg_prevent_overlap` + funkce `create_reservation`) – jinak kalendář neukáže rezervace a duplicity se neblokují
- [ ] **Označit duplicitní rezervace v adminu jako Stornované** (status `cancelled`) – neblokují kalendář
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