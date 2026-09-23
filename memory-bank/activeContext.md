# Active Context

> Aktuální stav projektu, poslední změny a otevřené otázky.
> Aktualizováno: 2026-09-23

## Pravidlo komunikace

- **V chatu píšeme vždy jenom česky** (odpovědi i komentáře kódu). Zapsáno v `.clinerules`.

## Projekt

**Bike Gallery Půjčovna** – rezervační systém půjčovny gravel kol.
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL + RLS + Auth) jako backend
- Resend pro e-maily
- Deploy: GitHub Pages (statický export) přes GitHub Actions
- Repo: `masu11/bikegallery_pujcovna` → https://masu11.github.io/bikegallery_pujcovna

## Poslední pracovní sezení (23. 9. 2026, noc – 3. úkol, follow-up)

Uživatel poslal raw e-mail: PNG data URI **byl** v e-mailu, ale **Gmail blokuje `data:` URI
v obrázcích** → QR se nezobrazil. **Oprava:** QR PNG se nyní **uloží do Supabase Storage**
(bucket `bike-photos`, cesta `qr/{reservation_id}.png`, `upsert: true`) a v e-mailu se použije
**veřejný URL** (funguje ve všech klientoch). Fallback: data URI (mimo Gmail) → SVG.
- `lib/qrImage.ts`: nový `base64ToBlob()` helper.
- `lib/email.ts`: `qrEmailHtml` param přejmenovan `qrPng` → `qrUrl`.
- `app/admin/rezervace/page.tsx`: upload QR do Storage + veřejný URL.
- Ověřeno: `tsc --noEmit` + `npm run build` OK.

## Předchozí pracovní sezení (23. 9. 2026, noc – 3. úkol)

Uživatel nahlásil: **přidje e-mail o potvrzené rezervaci, ale QR kód nepřidje.** Navíc chce
v potvrzovacím e-mailu větší detail – název a variantu kola.

### Příčina
- QR kód se v e-mailu posílal jako **SVG** (`renderToStaticMarkup(<QRCodeSVG …>)` vložený do HTML).
  E-mailové klienty (Gmail, Outlook, Apple Mail…) **SVG v HTML e-mailu nerenderují** → e-mail přišel,
  ale QR byl neviditelný.

### Oprava
- **Nový `lib/qrImage.ts`:** `svgToPngDataUri()` – konverze SVG → PNG data URI (canvas v browseru,
  `'use client'`). PNG funguje ve všech e-mailových klientoch.
- **`lib/email.ts`:** `qrEmailHtml` nyní používá `<img src="data:image/png…">` místo SVG a obě šablony
  (`confirmationEmailHtml` + `qrEmailHtml`) mají **tabulku kol** (název, varianta, dny, cena/den, mezisoučet).
- **`app/admin/rezervace/page.tsx`:** při potvrzení (status `reserved`) se QR převede na PNG
  (fallback na SVG při chybě) a do e-mailu se posílají `items` (kola z rezervace).
- **`app/rezervace/page.tsx`:** potvrzovací e-mail posílá `items` (kola z košíka).

### Ověření
- `npx tsc --noEmit` – bez chyb, `npm run build` – úspěšné (17 stránek).

### Poznámka
- QR v administraci (detail rezervace) zůstává SVG – v browseru funguje; PNG je jen pro e-mail.

## Předchozí pracovní sezení (23. 9. 2026, noc – 2. úkol, follow-up)

Uživatel spustil čistící SQL, ale **krok 2 (unikátní index) selhal**:
`23505: Key (bike_id, lower(color), lower(size))=(00000000-0000-0000-0000-000000000001, černá, l) is duplicated`.
Příčina: existují **aktivné duplicity s rezervacemi**, které starý krok 1 neskryl (skrýval jen duplicity
bez rezervací). **Oprava:** nový krok 1 v `progress.md` skryje VŠE duplicity kromě jedné ponechané na
skupinu (ta s rezervacemi, jinak nejstarší) – historie rezervací zůstane, varianty se jen skryjí.
Uživatel má spustit nový SQL z `progress.md` (krok 1 + krok 2) znovu.

## Předchozí pracovní sezení (23. 9. 2026, noc – 2. úkol)

Uživatel nahlásil: **u jednoho kola se násobí varianty v tabulce `bike_variants` – při mazání přes rozhraní spíše přibývají (87 ks), ič už nic nepřidával.**

### Příčina
- Tabulka `bike_variants` **nemá unikátní kontraintu** na (bike_id, barva, velikost) – duplicity může vytvořit
  starý kód („smazat vše + vložit znovu“), který se v prostředí uživatele ještě vykonává (např. starý JS
  v cache browseru nebo nenasazená verze). Každé uložení pak zdvojuje varianty (exponenciální růst).
- Synchronizace v `app/admin/kola/page.tsx` závisela na tom, že formulárové varianty mají `id`; při
  dvojitém kliku na „Uložit“ (race condition, `setSaving` je asynchronní) mohla vložit duplicity.

### Oprava
- **`app/admin/kola/page.tsx`:** nová idempotentní synchronizace variant:
  - deduplikace formulárových variant podle (barva + velikost, bez ohledu na velká/malá písmena),
  - existující varianty se aktualizují (nejdřív podle `id`, pak podle barva+velikost),
  - nové se vloží, odebrané se smažou (při FK chybě skryjí se `active = false`),
  - ochrana před dvojitým klikem (`if (saving) return`).
- **`supabase/schema.sql`:** nový **parciální unikátní index** `uq_bike_variants_active`
  na (bike_id, lower(color), lower(size)) WHERE active = true – DB-level ochrana před duplicitami.
  POZOR: před vytvořením je nutné vyčistit existující duplicity (SQL v `progress.md`).
- **`memory-bank/progress.md`:** zlepšený čistící SQL (case-insensitive) + vytvoření indexu.

### Ověření
- `npx tsc --noEmit` – bez chyb, `npm run build` – úspěšné (17 stránek).

### Důležité pro uživatele
1. **Spustit čistící SQL** z `progress.md` v Supabase SQL Editor (krok 1 – skrytí duplicit, krok 2 – unikátní index).
2. **Aktualizovat verziu aplikace** (nový build / hard refresh Ctrl+F5), aby se nevykonával starý JS.

## Předchozí pracovní sezení (23. 9. 2026, noc)

Uživatel nahlásil: **v rezervaci je vidět QR kód, ale aplikace mBank hlásí, že je nesprávný.**

### Příčina
- `lib/qr.ts` (`buildQrPaymentString`) generoval řetězec, který **neodpovídal standardu QR Platby (ČBA)**:
  1. **Dvojitá hvězdička** po `SPD*1.0` – `['SPD*1.0*', 'ACC:...'].join('*')` dalo `SPD*1.0**ACC:...`.
  2. **Špatný pořadok polí** – `AM` stál před `CC` a `MSG` před `X-VS` (standard vyžaduje `CC` → `AM` → `X-VS` → `MSG`).
  3. **Chyběl CRC32 kontrolní součet** – mBank (a většina bank) ho vyžaduje.
  4. **Chyběla závěrečná hvězdička** na konci řetězce.

### Oprava
- **`lib/qr.ts`:** kompletně přepsaný `buildQrPaymentString` – správný pořadok polí dle specifikace,
  CRC-32 (IEEE 802.3) kontrolní součet, závěrečná hvězdička, sanitizace VS na číslice (max 10),
  volitelný `recipientName` (pole `RN`). Nová funkce `isValidIban()` (mod 97) pro kontrolu IBAN.
- **`app/admin/rezervace/page.tsx`:** oba volání `buildQrPaymentString` (QR v detailu + e-mail)
  posílají `recipientName: bankBeneficiary`; v detailu rezervace se zobrazí červené varování,
  pokud IBAN v nastavení je neplatný (seed `CZ0000000000000000000000` je neplatný!).
- **`tsconfig.json`:** doplněn `"target": "es2017"` (chyběl → `tsc` defaultně es3 a hlásil chybu
  iterace `Set` v `app/admin/kola/page.tsx`; navíc byl starý `tsconfig.tsbuildinfo` cache).

### Ověření
- Test v Node.js: CRC32("123456789") = CBF43926 (správný test vector), formát řetězce
  `SPD*1.0*ACC:...*CC:CZK*AM:...*X-VS:...*MSG:...*RN:...*CRC32:XXXXXXXX*` OK,
  IBAN validace (GB82…, DE89… platné; CZ000… neplatné) OK.
- `npx tsc --noEmit` – bez chyb (po smazání starého `tsconfig.tsbuildinfo`).
- `npm run build` – úspěšné (17 statických stránek).

### Důležité pro uživatele
- **Seed IBAN `CZ0000000000000000000000` je neplatný** – dokud v Nastavení (`/admin/nastaveni`)
  nezadáte skutečný IBAN, banka QR kód odmítne. V detailu rezervace se nyní zobrazí varování.

## Předchozí pracovní sezení (23. 9. 2026, večer)

Uživatel nahlásil: **přidal obrázek v admin menu, ale beze změny – nic nevidí na webu ani v Storage → Files.**

### Příčina (stejná jako odpoledne)
- Nahrávání fotek v `app/admin/kola/page.tsx` ukládá do Supabase Storage bucketu `bike-photos`,
  ale **bucket neexistuje**, protože SQL z `supabase/storage.sql` **nebyl ještě spuštěn** v Supabase SQL Editoru.
- Uživatel **potvrdil, že storage.sql nespustil** a že ho spustí a zkusí nahrát fotku znovu.

### Kontrola připravenosti
- `public.is_admin()` je definovaná jako `security definer` v `supabase/schema.sql` (ř. 112) – vhodná pro storage politiky.
- `supabase/storage.sql` je kompletní (bucket + 4 politiky) – po spuštění upload by měl fungovat.

### Očekávaný další krok
1. Supabase Dashboard → SQL Editor → spustit obsah `supabase/storage.sql` (stačí jednou).
2. V administraci (`/admin/kola`) nahrát fotku znovu.
3. Pokud se zobrazí chyba, zkopírovat text chyby sem.

## Předchozí pracovní sezení (23. 9. 2026, odpoledne)

Uživatel nahlásil: **v administraci vytvořil nové kolo a přidal lokální fotku (jpeg/png), ale fotka se nezobrazila.**

### Příčina
- Nahrávání fotek v `app/admin/kola/page.tsx` používá Supabase Storage bucket `bike-photos`,
  ale **bucket nikde nebyl vytvořen** (ani v `schema.sql`, ani v `seed.sql`) a nebyly ani
  storage RLS politiky → upload selhával (chyba se zobrazovala, ale fotka se neuložila).
- Navíc chyba při ukládání fotky do tabulky `photos` se **ignorovala** (insert bez kontroly error).

### Oprava
- **Nový `supabase/storage.sql`:** vytvoření veřejného bucketu `bike-photos` + storage politiky
  (veřejné čtení, nahrávání/úprava/mazání jen pro admina přes `public.is_admin()`).
  **Nutné spustit v Supabase SQL Editor** (stačí jednou).
- **`app/admin/kola/page.tsx`:**
  - sanitizace názvu souboru (bez diakritiky, mezer a speciálních znaků) + `contentType` při uploadu,
  - kontrola chyby při insertu do `photos` (chyba se nyní zobrazí),
  - nápověda v UI, že je potřeba bucket `bike-photos` (SQL z `supabase/storage.sql`).

## Předchozí pracovní sezení (23. 9. 2026, dopoledne)

Uživatel nahlásil 3 okruhy problémů, které jsme vyřešili:

### 1. Role Pracovník vs. Administrátor (vysvětlení + UI)
- **Pracovník (worker):** dle RLS může číst rezervace, měnit status rezervací a číst profily.
  Nemůže spravovat kola, varianty, fotky, slevy, nastavení ani mazat rezervace.
- **Administrátor (admin):** vše co pracovník + plná správa katalogu (kola, varianty, fotky),
  slev, nastavení, profilů a mazání rezervací.
- **UI:** `app/admin/layout.tsx` nyní skrývá položky menu (Kola, Slevy, Nastavení) pro pracovníky.

### 2. Chyby při rezervaci (RLS + e-mail)
- **RLS chyba "new row violates row-level security policy for table reservations":**
  příčinou bylo `.insert().select().single()` – veřejnost nemá SELECT policy na `reservations`,
  takže RETURNING selhal. Oprava: ID rezervace se generuje na klientovi (`crypto.randomUUID()`)
  a vkládá se bez `.select()` (`app/rezervace/page.tsx`).
- **E-mail "Unexpected token '<'":** na GitHub Pages (statický hosting) API route
  `/api/send-email` neexistuje → server vrací HTML 404 → `res.json()` selhal.
  Oprava: `lib/email.ts` kontroluje `content-type` (ne-JSON → srozumitelná hláška) a podporuje
  produkční endpoint přes `NEXT_PUBLIC_SEND_EMAIL_URL` (Supabase Edge Function).
- **Kalendář pro veřejnost:** veřejnost nemá SELECT na `reservations`, proto se kalendář
  načítá přes novou security definer funkci `get_calendar_reservations()` (vrací jen termín,
  status a variantu – bez osobních údajů). SQL je v `supabase/schema.sql`, je nutné ho spustit.

### 3. Duplicitní varianty u kola (např. Cannondale Topstone 2)
- **Příčina:** `app/admin/kola/page.tsx` mazal všechny varianty a znovu je vkládal.
  `reservation_items.bike_variant_id` má FK bez `ON DELETE CASCADE` → smazání varianty
  s rezervací selhalo (chyba se ignorovala) → staré varianty zůstaly + nové se vložily = duplicity.
- **Oprava:** synchronizace variant – update existujících, insert nových, odebrané se smažou,
  a pokud na ně odkazuje rezervace, skryjí se (`active = false`). Skryté varianty se
  v administraci ani na webu nezobrazují.
- **Poznámka:** stávající duplicity v DB je potřeba vyčistit SQL skriptem (viz progress.md).

## Předchozí sezení (22. 9. 2026)

Uživatel nahlásil 4 problémy, které jsme opravili:

### 1. Kalendář zobrazoval rezervaci pro všechny varianty kola
- **Příčina:** rezervace se filtrovaly podle všech variant kola, ne podle vybrané varianty.
- **Oprava:** `CalendarReservation` nese `bike_variant_id`; v `app/kolo/page.tsx` se rezervace filtrují podle vybrané varianty (`variantReservations`).

### 2. Detail rezervace v administraci byl chudý
- **Oprava:** rozbalený detail v `app/admin/rezervace/page.tsx` nyní zobrazuje vše – číslo rezervace, status, vytvořeno, termín, dny, cenu, slevu, zákazníka (jméno/e-mail/telefon/adresa), poznámku a tabulku kol.

### 3. Kalendář neblokoval víkendy a české státní svátky
- **Řešení:** nový `lib/holidays.ts` s automatickým výpočtem českých svátků (11 pevných + Velký pátek + Velikonoční pondělí).
- Víkend/svátek nelze vybrat jako začátek ani konec termínu → víkendová půjčka je automaticky min. pátek–pondělí (4 dny).
- Kalendář má prop `blockedDays` pro případné ruční blokování.

### 4. Nepřišel potvrzovací e-mail
- **Příčina:** `RESEND_FROM=onboarding@resend.dev` na free plánu Resend doručuje e-maily POUZE na e-mail registrovaný v Resend účtu.
- **Oprava:** kontrola výsledku `sendEmail` + varování v UI (veřejná rezervace i admin), doplněné komentáře v `.env` / `.env.example`.

## Ověření

- `npx tsc --noEmit` – bez chyb
- `npm run build` – úspěšné (17 statických stránek)
- Test svátků: Velký pátek 3. 4. 2026, Velikonoční pondělí 6. 4. 2026, 28. 9. svátek, sobota nepracovní – OK

## Otevřené otázky / rozhodnutí

- **E-maily v produkci:** na GitHub Pages API route `/api/send-email` nefunguje (statický hosting). Pro produkci je potřeba Vercel/Netlify nebo Supabase Edge Function (`supabase/functions/send-email`). Zatím nevyřešeno – čeká na rozhodnutí uživatele.
- **Vlastní doména v Resend:** uživatel musí ověřit doménu a změnit `RESEND_FROM`, aby e-maily chodily na libovolné adresy.
- **Ruční blokované dny:** kalendář podporuje `blockedDays`, ale v administraci zatím není UI pro jejich správu (svátky se počítají automaticky).

## Klíčové soubory

| Soubor | Účel |
|---|---|
| `lib/holidays.ts` | Automatický výpočet českých státních svátků |
| `components/BikeCalendar.tsx` | Kalendář s blokováním víkendů/svátků a filtrem variant |
| `app/kolo/page.tsx` | Detail kola – výběr varianty + termínu |
| `app/rezervace/page.tsx` | Veřejná rezervace + odeslání e-mailu |
| `app/admin/rezervace/page.tsx` | Administrace rezervací (detail, status, QR, e-mail) |
| `app/api/send-email/route.ts` | API route pro Resend (jen lokálně/server) |
| `lib/email.ts` | Odesílání e-mailů + HTML šablony |
| `supabase/functions/send-email/index.ts` | Alternativa pro produkci (Edge Function) |