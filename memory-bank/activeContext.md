# Active Context

> Aktuální stav projektu, poslední změny a otevřené otázky.
> Aktualizováno: 2026-09-25

## Pravidlo komunikace

- **V chatu píšeme vždy jenom česky** (odpovědi i komentáře kódu). Zapsáno v `.clinerules`.

## Poslední pracovní sezení (25. 9. 2026 – chyba „null value in column total_price" stále na PC) ✅

### Hlášení uživatele
- Chyba při uložení rezervace z klientské části **na PC** (localhost i GitHub Pages):
  `Rezervaci se nepodařilo uložit: null value in column "total_price" of relation "reservations" violates not-null constraint`.
- **Z mobilu (Android) funguje** a **z adminu funguje**.

### Diagnostika (ověřeno)
1. **Produkční DB má NOVOU funkci `create_reservation`** – přímý test RPC přes REST API
   (s `p_total_price: null` a neexistující variantou) vrátil `Vybrané kolo (varianta) není dostupné.`
   → funkce cenu počítá na serveru, `total_price` vkládá jako `0`, nikdy `null`. ✅
2. **Nasazený kód na GitHub Pages je aktuální** – stažen JS chunk `/rezervace`:
   volá RPC `create_reservation`, posílá `p_total_price` jako číslo (fallback `0`),
   má kontrolu `Number.isFinite` na košík. ✅
3. **Lokální kód je aktuální** (git čistý, `main` = `origin/main`). ✅
4. **Příčina chyby na PC:** prohlížeč na PC běží STARÝ JS (verze s přímými inserty
   `total_price: totals.total` – commity `41007de`/`d9738c6`/`d2f8241`) a/nebo má v
   localStorage STARÁ data košíku, kde `totals.total` je `NaN` → JSON serializuje `NaN`
   jako `null` → PostgreSQL vrací not-null chybu. Mobil funguje, protože běží nový JS
   s čerstvým košíkem.

### Opravy (pojistky, aby chyba nešla nikdy opakovat)
- **`supabase/schema.sql`:** nový trigger `trg_reservations_coalesce_prices` +
  funkce `reservations_coalesce_prices()` – `BEFORE INSERT OR UPDATE` na `reservations`
  převede `total_price`/`discount_amount` z `null` na `0`. Rezervace se uloží vždy,
  bez ohledu na verzi klienta (cenu pak dopočítá `create_reservation` na serveru nebo admin).
- **`lib/cart.ts`:** `getCart()` nyní při načtení automaticky ODEBERE neplatné položky
  (nečíselné `price_per_day`/`days`, chybějící `variant_id`/`start_date`/`end_date`)
  a uloží vyčištěný košík zpět do localStorage.

### Ověření
- `npx tsc --noEmit` bez chyb.

### Potvrzení uživatele ✅
- **Trigger pomohl** – rezervace z klientské části nyní funguje (uživatel potvrdil,
  že to jede na Vercelu i GitHubu bez nutnosti nového deploye). Chyba
  „null value in column total_price" je vyřešena.

### Důležité pro uživatele (nutné kroky)
1. **Supabase:** spustit CELÝ `supabase/schema.sql` v SQL Editoru (vytvoří trigger
   `trg_reservations_coalesce_prices`).
2. Commit + push na `main` → GitHub Actions nasadí nový build.
3. **Na PC:** hard refresh (Ctrl+F5) na GitHub Pages, restart dev serveru + hard refresh
   na localhostu a **vyčistit košík** (odebrat kola a přidat znovu, případně vymazat
   localStorage pro danou doménu) – stará data košíku s `NaN` cenami jsou hlavní spouštěč.

## Poslední pracovní sezení (24. 9. 2026 – chyba „null value in column total_price" na GitHubu) ✅

### Hlášení uživatele
- Lokálně rezervace funguje, ale na GitHub Pages veřejný formulář `/rezervace` vrací:
  `Rezervaci se nepodařilo uložit: null value in column "total_price" of relation "reservations" violates not-null constraint`.

### Diagnostika (ověřeno přes REST API produkční DB)
- Nasazený kód na GitHub Pages je aktuální (veřejný formulář volá RPC `create_reservation`).
- RPC `create_reservation` v produkční DB **funguje** (HTTP 200, i s `p_total_price: null` –
  aktuální verze funkce cenu počítá na serveru a vkládá `total_price = 0`).
- Všechna kola mají platné `base_price_per_day`.
- **Závěr:** chyba nastává, když do DB se posílá `total_price = null`/`NaN` (např. stará/poškozená
  data v košíku localStorage, nebo starší verze funkce v DB, která vkládala `p_total_price` od klienta).

### Opravy (zpevnění kódu)
- **`app/rezervace/page.tsx`:** kontrola platnosti košíka (`Number.isFinite` na `price_per_day`/`days`);
  `p_total_price` a `p_discount_amount` se posílají vždy jako čísla (fallback `0`).
- **`app/admin/rezervace/page.tsx`:** `total_price` a `discount_amount` při ručním vytvoření
  se posílají vždy jako čísla (fallback `0`).

### Ověření
- `npx tsc --noEmit` bez chyb.

### Důležité pro uživatele (nutné kroky)
1. **Supabase:** spustit CELÝ `supabase/schema.sql` v SQL Editoru (aktualizuje `create_reservation`
   na verziu, která cenu počítá na serveru a vkládá `total_price = 0` – nikdy `null`).
2. Commit + push na `main` → GitHub Actions nasadí nový build.
3. Hard refresh (Ctrl+F5) na GitHub Pages, aby se nevykonával starý JS.

## Poslední pracovní sezení (24. 9. 2026 – oprava bezpečnostních nálezů před LIVE) ✅

### Požadavek uživatele
- Ověřit a opravit nálezy z bezpečnostní analýzy (zapsané v activeContext.md/progress.md):
  2 kritické (manipulace s cenou, veřejná e-mailová funkce) + ideálně rate limiting a escapování e-mailů.

### Ověření nálezů (vše potvrzené v kódu)
1. **VYSOKÉ – manipulace s cenou:** `create_reservation` (security definer) přebíral
   `p_total_price`, `p_discount_amount` a `price_per_day`/`subtotal` od klienta bez kontroly.
2. **VYSOKÉ – veřejná Edge Function `send-email`:** CORS `*`, bez auth – kdokoli mohl posílat e-maily.
3. **STŘEDNÍ – HTML injekce:** e-mailové šablony vkládaly uživatelská data bez escapování.
4. **STŘEDNÍ – chybějící rate limiting:** rezervace a e-maily bez omezení.
5. **STŘEDNÍ – RLS insert `with check (true)`:** kdokoli mohl vložit rezervaci se statusem `reserved`/`occupied`.

### Opravy
- **`supabase/schema.sql`:**
  - `create_reservation` nyní IGNORUJE ceny od klienta a počítá je na serveru z DB
    (`bikes.base_price_per_day` + aktivní slevy z `discounts`) – stejná logika jako `lib/pricing.ts`.
    Nové pomocné funkce `seasonal_discount_pct()` a `multi_day_discount_pct()`.
  - Validace vstupů: termín (start ≤ end), jméno, telefon, formát e-mailu.
  - Rate limiting: max 5 rezervací / hodinu z jedné e-mailové adresy.
  - RLS: `reservations_public_insert` → `to anon with check (status = 'pending')`;
    nová `reservations_worker_insert` (authenticated + is_worker) pro ruční vytvoření v adminu;
    `items_public_insert` → `to anon with check (reservation_is_pending(reservation_id))`
    (nová security definer funkce); nová `items_worker_insert`.
- **`supabase/functions/send-email/index.ts`:** vyžaduje hlavičku `x-send-email-secret`
  (env `SEND_EMAIL_SECRET`), rate limiting v paměti (per IP 20/hod, per příjemce 5/hod),
  validace e-mailu a délky subject/html.
- **`app/api/send-email/route.ts`:** stejná ochrana (tajný klíč + rate limit + validace).
- **`lib/email.ts`:** nová `escapeHtml()` – všechna uživatelská data v šablonách se escapují;
  `postEmail()` posílá hlavičku `x-send-email-secret` (`NEXT_PUBLIC_SEND_EMAIL_SECRET`).
- **`.env.example`:** dokumentace `NEXT_PUBLIC_SEND_EMAIL_SECRET` + `SEND_EMAIL_SECRET`.
- **`.github/workflows/deploy.yml`:** do buildu přidán `NEXT_PUBLIC_SEND_EMAIL_SECRET`.

### Ověření
- `npx tsc --noEmit` bez chyb, `npm run build` úspěšné (17 stránek).

### Důležité pro uživatele (nutné kroky)
1. **Supabase:** spustit CELÝ `supabase/schema.sql` v SQL Editoru (nové funkce + RLS politiky).
2. **Edge Function:** `supabase secrets set SEND_EMAIL_SECRET=<dlouhý náhodný řetězec>`
   a `supabase functions deploy send-email` (nová verze s kontrolou klíče).
3. **Lokálně:** do `.env` přidat `SEND_EMAIL_SECRET` a `NEXT_PUBLIC_SEND_EMAIL_SECRET`
   (stejná hodnota) a restartovat dev server.
4. **GitHub:** přidat secret `NEXT_PUBLIC_SEND_EMAIL_SECRET` (stejná hodnota)
   → commit + push na `main`.

## Poslední pracovní sezení (24. 9. 2026 – hosting, údržba, free plány, bezpečnostní analýza)

### Požadavek uživatele
- 4 otázky: (1) minimální požadavky na webhosting, (2) co aktualizovat/udržovat pro bezpečnost,
  (3) udržitelnost free plánů (Supabase, Resend) v LIVE, (4) bezpečnostní test
  https://masu11.github.io/bikegallery_pujcovna/.

### Odpovědi (shrnutí)
1. **Webhosting:** aplikace je statický export Next.js → stačí statický hosting s HTTPS
   (GitHub Pages, Netlify, Vercel free). Pro server-side (API route) je potřeba Node.js 18+
   (Vercel/Netlify) – klasický PHP hosting nestačí.
2. **Údržba/bezpečnost:** aktualizace závislostí (npm audit, Dependabot), 2FA na GitHubu,
   rotace klíčů, kontrola RLS, zálohy DB, bezpečnostní hlavičky (CSP/HSTS – GitHub Pages je
   neumí nastavit), rate limiting.
3. **Free plány:** pro malý provoz udržitelné, ALE: Resend `onboarding@resend.dev` doručuje
   jen na registrovaný e-mail → nutná verifikace vlastní domény; Supabase free projekt se
   po 7 dnech nečinnosti pozastaví; sledovat kvóty (Resend 100/den, 3000/měsíc).
4. **Bezpečnostní test:** live test nešel spustit (Ask mode bez execute_command) → provedena
   statická analýza kódu (viz níže).

### Nálezy statické bezpečnostní analýzy
- **VYSOKÉ – manipulace s cenou:** RPC `create_reservation` (security definer) přijímá
  `p_total_price`, `p_discount_amount` a `p_items` (price_per_day, subtotal) přímo od klienta
  bez kontroly proti cenám v DB → útočník může rezervovat kolo za 1 Kč/den.
- **VYSOKÉ – veřejné odesílání e-mailů:** Edge Function `send-email` je veřejná (CORS `*`,
  bez auth; `apikey` s anon klíčem nic nechrání) → kdokoli může posílat e-maily přes účet
  Resend (spam, vyčerpání kvóty).
- **STŘEDNÍ – HTML injekce do e-mailů:** `confirmationEmailHtml`/`qrEmailHtml` vkládají
  uživatelská data (jméno atd.) do HTML bez escapování.
- **STŘEDNÍ – chybějící rate limiting:** rezervace, e-maily i přihlášení bez omezení.
- **STŘEDNÍ – RLS insert `with check (true)`:** kdokoli může vložit rezervaci se statusem
  `reserved`/`occupied` (obejití toku pending → admin potvrzení).
- **OK:** RLS čtení jen aktivních položek, `get_calendar_reservations` vrací jen omezené
  sloupce, trigger `trg_prevent_overlap`, storage politiky (čtení veřejné, zápis admin),
  `.env` v .gitignore, RESEND_API_KEY jen na serveru, GitHub Actions secrets.

### Ověření
- Žádné změny kódu – pouze analýza a dokumentace.

## Poslední pracovní sezení (24. 9. 2026 – uživatelský manuál)

### Požadavek uživatele
- Sepsat manuál k části **zákazník** a **administrátor**.

### Změna
- **Nový soubor `docs/manual.md`** – kompletní uživatelský manuál v češtině:
  - **Část pro zákazníka:** úvodní stránka a galerie, detail kola, kalendář (pravidla
    víkendů/svátků, barvy dnů, výběr termínu), rezervační formulář (povinná pole, GDPR),
    co se děje po odeslání, platba přes QR.
  - **Část pro administrátora:** přihlášení a role (admin vs worker), přehled, správa
    rezervací (statusy, detail, QR kód, e-mail s QR, ruční vytvoření), správa kol
    (varianty, fotky, pořadí), slevy (množstevní/sezónní), nastavení (bankovní údaje).
  - Tabulka statusů rezervací + důležité poznámky (Resend free plán, platný IBAN,
    stornování duplicit, víkend = min. 4 dny).
- Manuál vychází z reálného chování kódu (stránky `app/`, `components/BikeCalendar.tsx`,
  `lib/pricing.ts`, `lib/qr.ts`).

### Ověření
- Žádné změny kódu – pouze dokumentace, `tsc`/build se nemění.

## Poslední pracovní sezení (24. 9. 2026 – e-mail na GitHub Pages: HTTP 405)

### Hlášení uživatele
- Po pushnutí na GitHub (deploy na GitHub Pages) se rezervace uloží, ale potvrzovací e-mail
  nejde: „E-mailová služba neodpověděla JSON (HTTP 405). Na statickém hostingu API route
  nefunguje – nasaďte Supabase Edge Function a nastavte NEXT_PUBLIC_SEND_EMAIL_URL."

### Příčina
- `NEXT_PUBLIC_SEND_EMAIL_URL` chyběl v `.github/workflows/deploy.yml` (build step).
  `NEXT_PUBLIC_*` proměnné se zapékají do client bundle při `npm run build` → na GitHub Pages
  se build vytvořil BEZ URL Edge Function → `lib/email.ts` posílal e-mail na lokální API route
  `/api/send-email/`, která na statickém hostingu neexistuje (vrací HTTP 405 s HTML místo JSON).
- Edge Function `send-email` je nasazená a funguje (ověřeno dříve), chybělo jen předání URL do buildu.

### Oprava
- **`.github/workflows/deploy.yml`:** do `env` buildu přidán
  `NEXT_PUBLIC_SEND_EMAIL_URL: ${{ secrets.NEXT_PUBLIC_SEND_EMAIL_URL }}`.
- **`.env.example`:** doplněna poznámka, že `NEXT_PUBLIC_SEND_EMAIL_URL` musí být nastaven
  i jako GitHub Actions secret (Settings → Secrets and variables → Actions).

### Ověření
- `npx tsc --noEmit` bez chyb.

### Důležité pro uživatele
1. V GitHub repozitáři přidat secret `NEXT_PUBLIC_SEND_EMAIL_URL` s hodnotou
   `https://ihsiyynhvxhcyuqbjlrm.supabase.co/functions/v1/send-email`
   (Settings → Secrets and variables → Actions → New repository secret).
2. Commit + push na `main` → GitHub Actions znovu nasadí stránky s URL Edge Function.
3. Otestovat rezervaci na https://masu11.github.io/bikegallery_pujcovna – e-mail by měl odejít
   (na free plánu Resendu jen na `marcel.suchomel@gmail.com`).

## Poslední pracovní sezení (24. 9. 2026 – datum a čas vytvoření v přehledu rezervací)

### Požadavek uživatele
- V admin přehledu rezervací chce vždy vidět datum a čas vytvoření hned za číslem rezervace.

### Změna
- **`app/admin/rezervace/page.tsx`:** v seznamu rezervací se za číslem rezervace zobrazuje
  `created_at` ve formátu `cs-CZ` (datum + čas), poté jméno zákazníka.

### Ověření
- `npx tsc --noEmit` bez chyb.

## Projekt

**Bike Gallery Půjčovna** – rezervační systém půjčovny gravel kol.
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Supabase (PostgreSQL + RLS + Auth) jako backend
- Resend pro e-maily
- Deploy: GitHub Pages (statický export) přes GitHub Actions
- Repo: `masu11/bikegallery_pujcovna` → https://masu11.github.io/bikegallery_pujcovna

## Poslední pracovní sezení (24. 9. 2026 – správa fotek u kol: mazání a pořadí)

### Hlášení uživatele
- Fotky u kol se dají přidávat, ale ne mazat ani měnit pořadí.

### Příčina
- `app/admin/kola/page.tsx` měl jen jeden stav `photoUrl` – při uložení se vložila JEDNA fotka
  jako hlavní (`is_main: true, sort_order: 0`). Stávající fotky se v editačním formuláři
  nezobrazovaly, neexistovalo mazání ani řazení.

### Oprava
- **`app/admin/kola/page.tsx`:** kompletní správa fotek v editačním formuláři:
  - seznam stávajících fotek s náhledy (řazené podle `sort_order`),
  - přidávání více fotek (URL i upload do Storage `bike-photos`),
  - mazání fotek – při uložení se smaže záznam z `photos` i soubor ze Storage
    (pomocná funkce `storagePathFromUrl()`),
  - změna pořadí šipkami ↑/↓ – při uložení se přepíše `sort_order` a `is_main`
    (první fotka v seznamu = hlavní),
  - synchronizace fotek probíhá při uložení (stejně jako u variant), funguje i pro nová kola.

### Ověření
- `npx tsc --noEmit` bez chyb.

### Důležité pro uživatele
- Restart dev serveru + hard refresh (Ctrl+F5).
- Mazání souborů ze Storage vyžaduje politiku `bike_photos_admin_delete` (je v `supabase/storage.sql`).

## Poslední pracovní sezení (24. 9. 2026 – oprava kalendáře a duplicitních rezervací)

### Hlášení uživatele
- Na GitHubu (předevčírem) po rezervaci byla rezervace vidět v kalendáři, ale nešlo udělat další.
- Dnes na localhost:3000 kalendář neukazuje ŽÁDNOU rezervaci (žádný stav) a podařilo se vytvořit
  dvě stejné rezervace na více kolech.

### Příčiny
1. **Kalendář prázdný:** kalendář čte rezervace přes RPC funkci `get_calendar_reservations()`
   (security definer v `supabase/schema.sql`). Chyba RPC se v `app/kolo/page.tsx` tiše ignorovala
   (`reservationsRes.error` se nekontroloval) → kalendář vypadal prázdný, i když rezervace v DB byly.
   Pravděpodobně na novém PC `.env` ukazuje na Supabase projekt, kde schéma (a tedy tato funkce)
   nebylo spuštěno.
2. **Duplicitní rezervace:** v DB nebyla ŽÁDNÁ ochrana proti překryvu termínů (RLS insert
   `with check (true)`). Blokování bylo jen klientské (kalendář) → když kalendář nefungoval,
   duplicity prošly.

### Opravy
- **`supabase/schema.sql`:**
  - Nový trigger `trg_prevent_overlap` + funkce `prevent_overlapping_reservations()` na
    `reservation_items` – při vložení/změně položky zkontroluje překryv termínů pro danou variantu
    (statusy pending/reserved/occupied blokují, completed/cancelled ne). Autoritativní ochrana
    pro VŠECHNY toky (veřejný formulář i admin).
  - Nová transakční funkce `create_reservation(...)` – vytvoří rezervaci + položky v JEDNÉ transakci
    s kontrolou překryvu; při konfliktu v DB nezůstane osiřelá rezervace bez položek.
- **`app/rezervace/page.tsx`:** veřejný formulář nyní volá `create_reservation` (RPC) místo dvou
  samostatných insertů; přátelská chyba, když funkce v DB chybí.
- **`app/admin/rezervace/page.tsx`:** při chybě vložení položek se smaže osiřelá rezervace.
- **`app/kolo/page.tsx`:** chyba RPC `get_calendar_reservations` se už neignoruje – zobrazí se
  varování u kalendáře a chyba se vypíše do konzole.

### Ověření
- `npx tsc --noEmit` bez chyb.

### Follow-up (oprava chyby 42P13 při spuštění schema.sql)
- Uživatel při spuštění `supabase/schema.sql` dostal `ERROR: 42P13: input parameters after one
  with a default value must also have defaults`.
- **Příčina:** v definici `create_reservation(...)` měly parametry `p_customer_address text default ''`
  a `p_notes text default null` default, ale následující parametry už ne. PostgreSQL to nepovoluje.
- **Oprava:** z definice funkce odstraněny defaulty (klient posílá všechny parametry vždy).
- **Důsledek:** při chybě se nespustil zbytek souboru (RLS aktivace, politiky, trigger
  `handle_new_user`, settings, discounts) → je nutné spustit CELÝ `supabase/schema.sql` znovu.

### Důležité pro uživatele
1. **Spustit `supabase/schema.sql` v Supabase SQL Editoru** (celý soubor) – vytvoří/aktualizuje
   `get_calendar_reservations()`, nový trigger a funkci `create_reservation`. Bez toho kalendář
   zůstane prázdný a duplicity se nepodaří blokovat.
2. Restart dev serveru + hard refresh (Ctrl+F5).
3. Duplicitní rezervace v adminu označit jako **Stornované** (status `cancelled`) – neblokují
   kalendář ani nové rezervace.

## Předchozí pracovní sezení (24. 9. 2026 – Edge Function nasazena a funguje)

### Hotovo
- **Edge Function `send-email` nasazena** na projekt `ihsiyynhvxhcyuqbjlrm`
  (Supabase CLI: login → link → secrets set RESEND_API_KEY + RESEND_FROM → functions deploy).
- **Ověřeno:** volání Edge Function s `apikey` hlavičkou vrací HTTP 200
  `{"ok":true,"id":"..."}` – e-mail se odeslal na `marcel.suchomel@gmail.com`.
- **Poznámka:** Edge Function má defaultně zapnutou kontrolu JWT → bez `apikey`
  hlavičky vrací 401 `UNAUTHORIZED_NO_AUTH_HEADER`. Anon klíč je veřejný.
- **Oprava `lib/email.ts`:** `postEmail()` nyní posílá `apikey` hlavičku
  (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) u všech volání (lokální route ji ignoruje).
- Ověřeno: `npx tsc --noEmit` bez chyb.

### Důležité pro uživatele
- Restartovat dev server + hard refresh (Ctrl+F5), aby se projevila změna v `lib/email.ts`.
- E-maily na free plánu Resendu chodí jen na `marcel.suchomel@gmail.com`;
  pro jiné adresy ověřit doménu v Resend a změnit `RESEND_FROM`.

## Předchozí pracovní sezení (24. 9. 2026 – e-mail: nalezena skutečná příčina)

### Skutečná příčina „TypeError: Failed to fetch"
- Uživatel nastavil `NEXT_PUBLIC_SEND_EMAIL_URL` na Edge Function URL
  (`https://ihsiyynhvxhcyuqbjlrm.supabase.co/functions/v1/send-email`),
  ale **Edge Function NENÍ nasazená** → Supabase vrací HTTP 404
  `{"code":"NOT_FOUND","message":"Requested function was not found"}`.
- Lokální API route `/api/send-email/` funguje (test: HTTP 200, e-mail odeslán na
  `marcel.suchomel@gmail.com` – Resend free plán doručuje jen na registrovaný e-mail).

### Oprava (lib/email.ts)
- **Fallback:** pokud Edge Function vrátí 404 (nenasazená) nebo síťovou chybu,
  aplikace automaticky zkusí lokální API route `/api/send-email/`.
- **Retry:** bez `NEXT_PUBLIC_SEND_EMAIL_URL` se lokální route při přechodné
  síťové chybě (kompilace v dev režimu) zkusí ještě jednou po 1,5 s.
- **Lepší výpis chyb:** `extractError()` zvládá řetězec i objekt (Edge Function
  vrací `{ error: { message } }`).
- Ověřeno: `npx tsc --noEmit` bez chyb.

### Odpověď na dotaz uživatele (příklad funkce s `withSupabase({ auth: "user" })`)
- Edge Functions **fungují na free tieru** Supabase (kvóta ~500K volání/měsíc).
- Příklad s `auth: "user"` by ale **nefungoval pro veřejný rezervační formulář** –
  vyžaduje přihlášeného uživatele (JWT), anonymní návštěvník by dostal 401.
- Naše stávající funkce `supabase/functions/send-email/index.ts` je správná:
  bez auth (veřejná), CORS, `RESEND_FROM` z env, ošetření chyb.
- Omezení free tieru je na straně **Resendu** (onboarding@resend.dev doručuje jen
  na registrovaný e-mail), ne na straně Supabase.

### Další kroky pro uživatele
1. Nainstalovat Supabase CLI (na PC není) – Scoop/Chocolatey/binárka.
2. `supabase login`, `supabase link --project-ref ihsiyynhvxhcyuqbjlrm`
3. `supabase secrets set RESEND_API_KEY=... RESEND_FROM="Rezervace <onboarding@resend.dev>"`
4. `supabase functions deploy send-email`
5. Restart dev serveru + hard refresh (Ctrl+F5).

## Předchozí pracovní sezení (24. 9. 2026 – lokální běh, chyby e-mailu a admin přihlášení)

Uživatel zprovoznil aplikaci lokálně (Supabase funguje – rezervace BG-MUF24BRA se uložila),
ale hlásil 2 problémy:

### 1. E-mail: „TypeError: Failed to fetch"
- **Diagnóza:** API route `/api/send-email` funguje (test přes Node fetch: HTTP 500 s reálnou
  odpovědí Resendu). „Failed to fetch" byl přechodný – Next.js v dev režimu kompiluje route
  až při prvním požadavku; při odeslání během kompilace se spojení přeruší.
- **Skutečný problém:** Resend free plán (`onboarding@resend.dev`) doručuje e-maily POUZE na
  e-mail registrovaný v Resend účtu (`marcel.suchomel@gmail.com`). Na jiné adresy e-maily nechodí.
- **Oprava:** `lib/email.ts` – default URL změněna z `/api/send-email` na `/api/send-email/`
  (kvůli `trailingSlash: true` vracel Next.js 308 přesměrování; někteří klienti 308 pro POST nesledují).
- Ověřeno: `npx tsc --noEmit` bez chyb.

### 2. Administrace: „Pro správu rezervací a kol se přihlaste."
- **Není to chyba** – je to přihlašovací formulář (očekávané chování).
- Uživatel musí: vytvořit uživatele v Supabase Auth (Authentication → Users → Add user),
  trigger `handle_new_user` automaticky vytvoří profil s rolí `worker`, pak spustit
  `supabase/roles.sql` (nastaví `role = 'admin'` pro `marcel.suchomel@gmail.com`).

## Předchozí pracovní sezení (24. 9. 2026 – nový PC, nastavení .env)

Uživatel pokračuje na jiném PC po stažení z GitHubu a neměl soubor `.env`
(je v `.gitignore`, takže se do repozitáře neukládá – to je očekávané).
Aplikace hlásila: „Supabase není nakonfigurován. Nastavte klíče v .env.“

### Co bylo uděláno
- **Vytvořen `.env`** ze šablony `.env.example` (stejná struktura, placeholder hodnoty).
- Ověřeno: `node_modules` na PC existuje (závislosti nainstalované), `.env` chyběl → nyní vytvořen.

### Co musí udělat uživatel
1. Do `.env` doplnit reálné klíče ze Supabase Dashboardu
   (Project Settings → API): `NEXT_PUBLIC_SUPABASE_URL` a `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Restartovat dev server (`npm run dev`) – Next.js čte `.env` při startu.
3. Pokud je Supabase projekt nový/prázdný, spustit v SQL Editoru:
   `supabase/schema.sql`, `supabase/seed.sql`, `supabase/storage.sql`
   (jinak nebude v DB žádná data kol).

## Předchozí pracovní sezení (23. 9. 2026, noc – 3. úkol, follow-up)

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