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

## Poslední pracovní sezení (23. 9. 2026, večer)

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