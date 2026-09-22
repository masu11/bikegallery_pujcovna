# Active Context

> Aktuální stav projektu, poslední změny a otevřené otázky.
> Aktualizováno: 2026-09-22

## Projekt

**Bike Gallery Půjčovna** – rezervační systém půjčovny gravel kol.
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL + RLS + Auth) jako backend
- Resend pro e-maily
- Deploy: GitHub Pages (statický export) přes GitHub Actions
- Repo: `masu11/bikegallery_pujcovna` → https://masu11.github.io/bikegallery_pujcovna

## Poslední pracovní sezení (22. 9. 2026)

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