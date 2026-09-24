# Manuál – Bike Gallery Půjčovna

> Uživatelský manuál k rezervačnímu systému půjčovny gravel kol.
> Pokrývá **část pro zákazníka** (veřejný web) i **část pro administrátora** (správa systému).

---

## Obsah

1. [Úvod](#1-úvod)
2. [Část pro zákazníka](#2-část-pro-zákazníka)
   - [Úvodní stránka a galerie](#21-úvodní-stránka-a-galerie)
   - [Detail kola a výběr termínu](#22-detail-kola-a-výběr-termínu)
   - [Kalendář – jak vybrat termín](#23-kalendář--jak-vybrat-termín)
   - [Rezervace (košík a formulář)](#24-rezervace-košík-a-formulář)
   - [Co se děje po odeslání](#25-co-se-děje-po-odeslání)
   - [Platba](#26-platba)
3. [Část pro administrátora](#3-část-pro-administrátora)
   - [Přihlášení a role](#31-přihlášení-a-role)
   - [Přehled](#32-přehled)
   - [Rezervace](#33-rezervace)
   - [Kola](#34-kola)
   - [Slevy](#35-slevy)
   - [Nastavení](#36-nastavení)
4. [Statusy rezervací](#4-statusy-rezervací)
5. [Důležité poznámky a tipy](#5-důležité-poznámky-a-tipy)

---

## 1. Úvod

Aplikace **Bike Gallery Půjčovna** umožňuje:

- **Zákazníkovi** prohlédnout si nabídku gravel kol, vybrat variantu (barva / velikost),
  zvolit termín v kalendáři, vytvořit rezervaci online a zaplatit převodem přes QR platbu.
- **Administrátorovi** spravovat kola, varianty, fotky, slevy a nastavení, sledovat
  a potvrzovat rezervace a posílat klientům e-maily s QR kódem na platbu.

Systém má dvě části:

| Část | Adresa | Přístup |
|---|---|---|
| Veřejný web (zákazník) | `/` (úvod), `/galerie`, `/kolo?slug=…`, `/rezervace` | kdokoli |
| Administrace | `/admin` a podstránky | jen přihlášení uživatelé (role admin / worker) |

---

## 2. Část pro zákazníka

### 2.1 Úvodní stránka a galerie

**Úvodní stránka** (`/`) představuje půjčovnu a ve třech krocích vysvětluje, jak rezervace funguje:

1. **Vyberte kolo** – prohlédněte si galerii gravel kol.
2. **Zarezervujte termín** – v kalendáři uvidíte, kdy je kolo volné, vyberte datum a vyplňte kontaktní údaje.
3. **Vyrazte na cestu** – po potvrzení rezervace a platbě si kolo vyzvednete.

Tlačítko **„Rezervovat kolo"** vás přesměruje do **galerie** (`/galerie`).

**Galerie** zobrazuje všechna aktivní kola (hlavní fotka, název, značka, počet variant).
Kliknutím na kolo se otevře jeho **detail**.

### 2.2 Detail kola a výběr termínu

Detail kola (`/kolo?slug=…`) obsahuje:

- **Fotky** – hlavní fotku a náhledy (pokud jich je víc).
- **Popis** – značku, název a rozšířený popis kola.
- **Cenu za den**.
- **Výběr varianty** – tlačítka s kombinací **barva / velikost** (např. „černá / L").
  Každá varianta má **vlastní kalendář dostupnosti** – rezervace se zobrazují jen pro vybranou variantu.
- **Kalendář** – výběr termínu půjčení (viz [2.3](#23-kalendář--jak-vybrat-termín)).
- **Shrnutí ceny** – po výběru termínu se zobrazí počet dní, případné slevy a celková cena.
- Tlačítko **„Pokračovat k rezervaci"** – přidá kolo do košíku a přejde na rezervační formulář.

### 2.3 Kalendář – jak vybrat termín

Kalendář zobrazuje dostupnost vybrané varianty kola. Barvy dnů:

| Barva | Význam |
|---|---|
| Bílá | Volné |
| Žlutá | Rezervované (čeká na potvrzení / potvrzeno) |
| Červená (přeškrtnuté) | Obsazené |
| Šedá (přeškrtnuté) | Víkend / státní svátek – nelze vybrat |
| Tmavá | Vybraný termín |

**Jak vybrat termín:**

1. Klikněte na **první den** termínu.
2. Klikněte na **poslední den** termínu.
3. Termín je „od–do" **včetně obou dnů** (např. pátek → pondělí = 4 dny).
4. Tlačítkem **„Vyčistit"** výběr zrušíte.

**Pravidla kalendáře:**

- **Víkend a český státní svátek nelze zvolit jako začátek ani konec termínu.**
  Víkend/svátek může být uvnitř termínu, ale nesmí na něm začínat ani končit.
- Důsledek: víkendová půjčka je minimálně **pátek → pondělí = 4 dny**.
- **Obsazené dny** (červené) nelze vybrat vůbec.
- Pokud vybraný rozsah obsahuje obsazený/rezervovaný den, výběr se nepodaří dokončit
  a začnete znovu od kliknutého dne.
- Minulé dny jsou neaktivní.

### 2.4 Rezervace (košík a formulář)

Stránka **Rezervace** (`/rezervace`) má dvě části:

**1. Košík** – seznam vybraných kol s variantou, termínem, počtem dní a cenou.
Položku lze odebrat tlačítkem **„Odebrat"**.

**2. Kontaktní formulář** – povinné a nepovinné údaje:

| Pole | Povinné |
|---|---|
| Jméno a příjmení | ✅ |
| E-mail | ✅ |
| Telefon | ✅ |
| Adresa | – |
| Poznámka | – |
| Souhlas se zpracováním osobních údajů | ✅ (bez něj nelze odeslat) |

Pod formulářem je **souhrn ceny**: mezisoučet, sezónní sleva, množstevní sleva a celkem.

Po kliknutí na **„Odeslat požadavek"**:

- Rezervace se uloží do systému (včetně kontroly, že se termín nepřekrývá s jinou rezervací).
- Na váš e-mail přijde **potvrzení požadavku** s číslem rezervace (formát `BG-XXXX`) a přehledem kol.
- Zobrazí se potvrzovací obrazovka s číslem rezervace.

> Pokud se potvrzovací e-mail nepodaří odeslat, zobrazí se žluté upozornění.
> Rezervace je přesto uložená – kontaktujte půjčovnu telefonicky nebo e-mailem.

### 2.5 Co se děje po odeslání

1. **Požadavek přijat** – rezervace má status **„Čeká"** (`pending`).
2. **Potvrzení rezervace** – administrátor rezervaci potvrdí (status **„Rezervované"** / `reserved`).
   Na váš e-mail přijde **e-mail s QR kódem na platbu** a přehledem kol.
3. **Platba** – zaplatíte převodem (viz [2.6](#26-platba)).
4. **Vyzvednutí** – po připsání platby administrátor změní status na **„Obsazené"** (`occupied`)
   a kolo je připravené k vyzvednutí.
5. Po vrácení kola se rezervace označí jako **„Dokončené"** (`completed`).

### 2.6 Platba

- Platba probíhá **bankovním převodem**.
- V e-mailu s potvrzením najdete **QR kód** – naskenujte ho bankovní aplikací (např. mBank, ČSOB, …)
  a platba se předvyplní (částka, variabilní symbol, příjemce).
- **Variabilní symbol** = číslo rezervace (bez písmen, max. 10 číslic).
- QR kód je vygenerovaný podle standardu **QR Platby (ČBA)** – banka ho přijme,
  pokud je v nastavení systému zadaný **platný IBAN**.

---

## 3. Část pro administrátora

### 3.1 Přihlášení a role

Administrace je na adrese **`/admin`**. Bez přihlášení se zobrazí přihlašovací formulář
(e-mail + heslo). Účet vytváří správce v Supabase (Authentication → Users).

Systém rozlišuje **dvě role**:

| Role | Co může |
|---|---|
| **Administrátor** | Vše – přehled, rezervace, kola, slevy, nastavení |
| **Pracovník** | Jen přehled a rezervace (čtení + změna statusu) |

Menu se přizpůsobí roli – pracovník nevidí položky **Kola**, **Slevy** a **Nastavení**.

V levém panelu je vidět přihlášený e-mail a role. Tlačítkem **„Odhlásit se"** ukončíte sezení.

### 3.2 Přehled

Stránka **Přehled** (`/admin`) ukazuje:

- **Karty se statusy** – počet rezervací v každém statusu (Čeká, Rezervované, Obsazené,
  Dokončené, Stornované).
- **Nadcházející rezervace** – nejbližších 5 rezervací (číslo, zákazník, termín, cena, status).
  Odkaz „Všechny rezervace →" vede na správu rezervací.

### 3.3 Rezervace

Stránka **Rezervace** (`/admin/rezervace`) je hlavní pracovní nástroj.

**Seznam rezervací** – každá položka zobrazuje:

- číslo rezervace, **datum a čas vytvoření** a jméno zákazníka,
- termín (od → do) a celkovou cenu,
- e-mail a telefon zákazníka,
- **rozbalovací výběr statusu** (změna se uloží okamžitě),
- tlačítko **„Detail"** pro rozbalení podrobností.

**Filtrování** – nad seznamem jsou tlačítka: Vše, Čeká, Rezervované, Obsazené, Dokončené, Stornované.

**Detail rezervace** zobrazuje:

- číslo rezervace, status, datum vytvoření,
- termín, počet dní, celkovou cenu,
- zákazníka (jméno, e-mail – klikací odkaz, telefon, adresa),
- slevu a poznámku,
- tabulku kol (kolo, varianta, dny, cena/den, mezisoučet).

**QR kód na platbu** – u rezervace se statusem **„Rezervované"** se v detailu zobrazí QR kód
s částkou, variabilním symbolem a příjemcem. Pod QR kódem je nápověda:

> Pošlete klientovi tento QR kód e-mailem. Po připsání platby změňte status na „Obsazené".

Pokud je IBAN v nastavení neplatný, zobrazí se červené varování – banka by QR kód odmítla.

**Změna statusu na „Rezervované"** automaticky **odešle klientovi e-mail s QR kódem na platbu**
(QR se vygeneruje, uloží do úložiště a vloží do e-mailu). Výsledek odeslání se zobrazí
v modrém oznámení nahoře.

**Ruční vytvoření rezervace** – tlačítko **„+ Nová rezervace"** otevře formulář pro vytvoření
rezervace ručně (hodí se pro testování a pro zákazníky mimo web):

- Kolo * a varianta (barva / velikost) *,
- termín Od * a Do *,
- jméno *, e-mail * a telefon * zákazníka, adresa, poznámka,
- status (Rezervované / Obsazené),
- průběžný výpočet ceny se slevami.

### 3.4 Kola

Stránka **Kola** (`/admin/kola`) spravuje katalog.

**Seznam kol** – tabulka s názvem, značkou, cenou za den, počtem variant, stavem
(Aktivní / Neaktivní) a akcemi (Upravit / Smazat).

**„+ Nové kolo"** nebo **„Upravit"** otevře formulář:

**Základní údaje:**

| Pole | Poznámka |
|---|---|
| Název * | např. „Cannondale Topstone 2" |
| Značka | např. „Cannondale" |
| Slug (URL) * | identifikátor v adrese, např. `cannondale-topstone-2` |
| Cena za den (Kč) * | základní cena bez slev |
| Krátký popis | zobrazuje se v galerii |
| Rozšířený popis | zobrazuje se na detailu kola |
| Aktivní | zaškrtnuto = kolo se zobrazuje v galerii |

**Varianty (barva / velikost):**

- Každá varianta je **vlastní jednotka dostupnosti** – rezervace se vážou na konkrétní variantu.
- Tlačítkem **„+ Přidat variantu"** přidáte řádek s barvou a velikostí, křížkem **×** variantu odeberete.
- Při uložení se varianty **synchronizují**: nové se přidají, změněné upraví, odebrané se smažou
  (pokud na ně odkazuje rezervace, jen se skryjí, aby se neztratila historie).
- Duplicitní kombinace (barva + velikost) se automaticky sloučí.

**Fotky:**

- **První fotka v seznamu je hlavní** (zobrazuje se v galerii a jako hlavní na detailu).
- Pořadí měníte šipkami **↑ / ↓**, fotku smažete křížkem **×** (smaže se záznam i soubor z úložiště).
- Fotku přidáte dvěma způsoby:
  - **z URL** – vložíte adresu obrázku a kliknete „+ Přidat fotku z URL",
  - **nahráním souboru** – vyberete obrázek z počítače (uloží se do Supabase Storage, bucket `bike-photos`).
- Po uložení se změny fotek projeví na webu.

**Smazání kola** – tlačítko „Smazat" (potvrzovací dialog). Kolo se smaže z katalogu.

### 3.5 Slevy

Stránka **Slevy** (`/admin/slevy`) spravuje slevy, které se automaticky aplikují při výpočtu ceny.

**Dva typy slev:**

| Typ | Kdy se uplatní | Pole |
|---|---|---|
| **Množstevní** | při počtu dní ≥ minimální počet | Minimální počet dní (např. 3, 7) |
| **Sezónní** | v zadaném datumovém rozsahu | Od, Do |

Společná pole: **Název ***, **Sleva (%) ***, **Aktivní** (zaškrtnuto = sleva se používá).

**Výpočet ceny** (viz `lib/pricing.ts`):

```
cena = (cena/den × dny × (1 − sezónní/100)) × (1 − množstevní/100)
```

- U množstevních slev se použije **nejvyšší** aktivní sleva pro daný počet dní.
- U sezónních slev se slevy **sčítají** (pokud je aktivních víc).
- Slevy se počítají z aktuálního data – sezónní sleva se uplatní, pokud dnešní datum
  spadá do rozsahu slevy.

V seznamu **„Aktuální slevy"** každou slevu upravíte (**Upravit**) nebo smažete (**Smazat**).

### 3.6 Nastavení

Stránka **Nastavení** (`/admin/nastaveni`) obsahuje:

**Rezervace:**

- **„Administrátor musí potvrdit rezervaci (jinak se potvrdí automaticky)"** – přepínač chování
  rezervací (zatím slouží jako nastavení systému).

**Bankovní údaje pro QR platbu:**

| Pole | Poznámka |
|---|---|
| Číslo účtu | formát `123456789/0100` |
| IBAN | **musí být platný**, jinak banka QR kód odmítne (v detailu rezervace se zobrazí varování) |
| SWIFT/BIC | kód banky |
| Příjemce platby | jméno příjemce, které se zobrazí v QR platbě |

Tlačítko **„Uložit nastavení"** uloží všechny hodnoty.

> ⚠️ Seed hodnota IBAN `CZ0000000000000000000000` je **neplatná** – před prvním použitím
> QR plateb zadejte skutečný IBAN.

---

## 4. Statusy rezervací

| Status | Český název | Význam |
|---|---|---|
| `pending` | Čeká | Zákazník odeslal požadavek, čeká na potvrzení |
| `reserved` | Rezervované | Potvrzeno – klientovi byl odeslán e-mail s QR kódem na platbu |
| `occupied` | Obsazené | Platba připsána, kolo je půjčené |
| `completed` | Dokončené | Kolo vráceno, rezervace uzavřena |
| `cancelled` | Stornované | Zrušeno – **neblokuje kalendář** ani nové rezervace |

**Doporučený tok:** `pending → reserved → occupied → completed` (+ `cancelled` kdykoli).

> Rezervace se statusem `pending`, `reserved` a `occupied` **blokují termín v kalendáři**
> (systém navíc brání vytvoření překrývající se rezervace na úrovni databáze).

---

## 5. Důležité poznámky a tipy

- **E-maily na free plánu Resendu** chodí jen na e-mail registrovaný v Resend účtu
  (`onboarding@resend.dev` doručuje pouze na registrovanou adresu). Pro doručení na
  libovolné adresy je nutné ověřit vlastní doménu a změnit `RESEND_FROM`.
- **IBAN musí být platný** – neplatný IBAN způsobí, že banka QR kód odmítne.
- **Duplicitní nebo chybné rezervace** označte jako **Stornované** (`cancelled`) –
  přestanou blokovat kalendář.
- **Víkendová půjčka** je minimálně 4 dny (pátek → pondělí), protože víkend a svátek
  nelze zvolit jako začátek ani konec termínu.
- **Veřejnost nevidí admin sekci** – přístup chrání přihlášení i databázová pravidla (RLS).
- **Pracovník** nemůže spravovat kola, slevy ani nastavení – jen rezervace a přehled.
- Po změnách v administraci se web aktualizuje okamžitě (data se čtou z databáze).
