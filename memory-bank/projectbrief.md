# Project Brief – Bike Gallery Půjčovna

> **Zakládající dokument projektu.** Toto je hlavní zdroj pravdy – definuje smysl, cíle,
> parametry a hranice aplikace. Při řešení každého dílčího úkolu se vracejte k tomuto
> dokumentu, abyste neztratili ze zřetele celkový kontext.
> Vytvořeno: 2026-09-22

## 1. Smysl projektu (proč to děláme)

Webová aplikace pro **půjčovnu gravel kol Bike Gallery**. Umožňuje zákazníkům:
- prohlédnout si nabídku kol (galerie, detail s fotkami a variantami),
- vybrat variantu kola (barva / velikost) a termín zapůjčení,
- vytvořit rezervaci online a dostat potvrzení e-mailem,
- zaplatit převodem přes QR platbu.

Majiteli půjčovny (admin) umožňuje:
- spravovat kola, varianty, fotky, slevy a nastavení,
- přehledně sledovat a spravovat rezervace (statusy, detaily, QR kódy),
- potvrzovat rezervace a posílat klientům e-maily s QR kódem na platbu.

## 2. Cíle projektu (co má být výsledkem)

1. Fungující veřejný rezervační web v češtině.
2. Administrace dostupná jen pro přihlášené uživatele (role admin / worker).
3. Automatické zasílání e-mailů (potvrzení požadavku, QR kód po potvrzení rezervace).
4. Přehledná správa cen a slev (sezónní, množstevní).
5. Nasazení na statický hosting (GitHub Pages) s bezplatnými nástroji (Supabase, Resend).

## 3. Základní parametry a technologie

| Oblast | Volba | Poznámka |
|---|---|---|
| Framework | Next.js 14 (App Router) + TypeScript | Tailwind CSS |
| Build/deploy | Statický export (`output: 'export'`) na GitHub Pages | `basePath`/`assetPrefix` kvůli subcestě `/bikegallery_pujcovna/` |
| Backend/DB | Supabase (PostgreSQL) | RLS, Auth, CLI |
| E-maily | Resend | API route `/api/send-email` + připravená Edge Function |
| QR platby | QR kód (QR platba CZ) z bankovních údajů | `lib/qr.ts` |
| CI/CD | GitHub Actions (`.github/workflows/deploy.yml`) | build + deploy na push do `main` |

## 4. Architektura a toky

```
Veřejnost ──▶ / (galerie, statické stránky)
        │
        ├─▶ /kolo?slug=...  (detail, výběr varianty + termínu v kalendáři)
        │
        ├─▶ /rezervace (košík + kontaktní formulář)
        │        └─▶ uložení do Supabase (reservations + reservation_items)
        │        └─▶ e-mail klientovi (potvrzení požadavku)
        │
        └─▶ Admin (přihlášení přes Supabase Auth)
              └─▶ /admin/rezervace (detail, statusy, QR kód, e-mail s QR)
```

**Datový model (zkráceně):** `bikes` → `bike_variants` (barva/velikost), `photos`;
`reservations` → `reservation_items` (vazba na variantu); `discounts` (seasonal/multi_day),
`settings` (bankovní údaje, přepínače), `profiles` (admin/worker). Podrobnosti:
[`supabase/schema.sql`](../supabase/schema.sql).

## 5. Klíčová pravidla a hranice („hranice aplikace")

### Obchodní pravidla
- **Varianta kola = vlastní jednotka dostupnosti.** Rezervace se v kalendáři zobrazují
  jen pro variantu, na kterou byly vytvořeny (`bike_variant_id`).
- **Víkend a český státní svátek nelze zvolit jako začátek ani konec termínu.**
  Svátky se počítají automaticky (`lib/holidays.ts`). Důsledek: víkendová půjčka je
  minimálně **pátek → pondělí = 4 dny**. Víkend/svátek může být uvnitř termínu.
- **Termín je „od–do" včetně obou dnů** – počet dní počítá `calcDays` (start i end se započítá).
- **Cena:** `cena/den × dny`, pak sezónní sleva (%), pak množstevní sleva (%) – `lib/pricing.ts`.
- **Statusy rezervace:** `pending → reserved → occupied → completed`, plus `cancelled`.
  QR kód na platbu se posílá při statusu `reserved`.
- **Zákazník vyplňuje:** jméno, e-mail, telefon; adresa a poznámka nepovinné; souhlas s GDPR povinný.

### Technická omezení (důležité!)
- **GitHub Pages = statický hosting.** NEfungují tam API route (`/api/send-email`),
  žádný server-side kód ani dynamické trasy. E-maily z webu v produkci MIMO lokální vývoj
  vyžadují: Vercel/Netlify **nebo** Supabase Edge Function (`supabase/functions/send-email`).
- **Resend free plán:** `onboarding@resend.dev` doručuje e-maily POUZE na e-mail
  registrovaný v Resend účtu. Pro doručení na libovolné adresy je nutná ověřená vlastní doména.
- **Veřejnost nemá přístup do admin sekce** (RLS + ochrana rout).
- **RLS:** veřejnost čte jen `active` položky a může VKLÁDAT rezervace; zapisovat do
  katalogu, slev, nastavení může jen admin/worker.

### Návrhové principy
- Vše v češtině (UI i komentáře).
- Komponenta kalendáře ([`components/BikeCalendar.tsx`](../components/BikeCalendar.tsx)) je
  znovupoužitelná – logika blokování (víkend/svátek/obsazenost) je v ní samotné.
- Rozdělení: `app/` (stránky), `components/` (UI), `lib/` (logika, klienti, typy),
  `supabase/` (schéma, seed, funkce), `memory-bank/` (kontext).
- Datumy v UI: formát ISO `yyyy-MM-dd` interně, česky při výpisu.

## 6. Definice hotovo (DoD)

Úkol je hotový, když:
- kód je typově čistý (`tsc --noEmit` bez chyb),
- `npm run build` projde,
- chování odpovídá obchodním pravidlům v sekci 5,
- změny jsou zapsané v `memory-bank/activeContext.md` a `progress.md`.

## 7. Rozhodnutí, která čekají na uživatele

1. **Produkční hosting e-mailů** – Vercel/Netlify vs. Supabase Edge Function.
2. **Vlastní doména v Resend** a `RESEND_FROM` pro doručování na libovolné adresy.
3. (Volitelně) ruční spravované zavírací dny v administraci přes `blockedDays`.

## 8. Odkazy

- Deploy: [`../.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
- Konfigurace Next: [`../next.config.mjs`](../next.config.mjs)
- Schéma DB: [`../supabase/schema.sql`](../supabase/schema.sql)
- Seed: [`../supabase/seed.sql`](../supabase/seed.sql)
- E-mail: [`../lib/email.ts`](../lib/email.ts), [`../app/api/send-email/route.ts`](../app/api/send-email/route.ts)
- Svátky: [`../lib/holidays.ts`](../lib/holidays.ts)
- Ceny: [`../lib/pricing.ts`](../lib/pricing.ts)
- Aktuální stav: [`activeContext.md`](activeContext.md) · [`progress.md`](progress.md)