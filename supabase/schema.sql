-- ============================================================
-- Bike Gallery Půjčovna — Supabase schéma
-- Spusťte tento soubor v Supabase SQL Editor (celý najednou)
-- ============================================================

-- ---------- Tabulky ----------

-- Kola
create table if not exists public.bikes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  brand text not null default '',
  short_description text not null default '',
  long_description text not null default '',
  base_price_per_day numeric not null default 0 check (base_price_per_day >= 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Varianty kol (barva + velikost)
create table if not exists public.bike_variants (
  id uuid primary key default gen_random_uuid(),
  bike_id uuid not null references public.bikes(id) on delete cascade,
  color text not null default '',
  size text not null default '',
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Fotky kol
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  bike_id uuid not null references public.bikes(id) on delete cascade,
  url text not null,
  alt text not null default '',
  is_main boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Rezervace
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_number text not null unique,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_address text not null default '',
  start_date date not null,
  end_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'reserved', 'occupied', 'completed', 'cancelled')),
  total_price numeric not null default 0,
  discount_amount numeric not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- Položky rezervace (kola v rezervaci)
create table if not exists public.reservation_items (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  bike_variant_id uuid not null references public.bike_variants(id),
  bike_name text not null,
  variant_label text not null default '',
  price_per_day numeric not null default 0,
  days integer not null default 1,
  subtotal numeric not null default 0
);

-- Slevy (sezónní a množstevní)
create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('seasonal', 'multi_day')),
  value numeric not null default 0 check (value >= 0 and value <= 100),
  start_date date,
  end_date date,
  min_days integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Nastavení (přepínač potvrzení, bankovní údaje pro QR, ...)
create table if not exists public.settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

-- Profily adminů (propojené s Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'worker' check (role in ('admin', 'worker')),
  created_at timestamptz not null default now()
);

-- ---------- Indexy ----------
create index if not exists idx_bikes_active on public.bikes(active);
create index if not exists idx_variants_bike on public.bike_variants(bike_id);
create index if not exists idx_photos_bike on public.photos(bike_id);

-- Jedinečnost AKTIVNÝCH variant (barva + velikost) pro každé kolo – ochrana před duplicitami.
-- POZOR: před vytvořením je nutné vyčistit existující duplicity (SQL v progress.md),
-- jinak vytvoření indexu selhaje.
create unique index if not exists uq_bike_variants_active
  on public.bike_variants (bike_id, lower(color), lower(size))
  where active = true;
create index if not exists idx_reservations_dates on public.reservations(start_date, end_date);
create index if not exists idx_reservations_status on public.reservations(status);
create index if not exists idx_items_reservation on public.reservation_items(reservation_id);
create index if not exists idx_items_variant on public.reservation_items(bike_variant_id);

-- ---------- Pomocné funkce pro role ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

create or replace function public.is_worker()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'worker')
  )
$$;

-- Bezpečné čtení rezervací pro kalendář (veřejnost).
-- Vrací POUZE údaje potřebné pro kalendář (termín, status, variantu),
-- ne osobní údaje zákazníků. Funkce běží s právy definera (obchází RLS),
-- ale vrací jen omezenou sadu sloupců.
create or replace function public.get_calendar_reservations()
returns table (
  id uuid,
  start_date date,
  end_date date,
  status text,
  bike_variant_id uuid
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.start_date, r.end_date, r.status, ri.bike_variant_id
  from public.reservations r
  join public.reservation_items ri on ri.reservation_id = r.id
  where r.status in ('pending', 'reserved', 'occupied')
$$;

grant execute on function public.get_calendar_reservations() to anon, authenticated;

-- ---------- Ochrana proti překryvu termínů (duplicitní rezervace) ----------
-- Trigger na reservation_items: při vložení/změně položky zkontroluje, že pro danou
-- variantu kola neexistuje jiná AKTIVNÍ rezervace (pending/reserved/occupied)
-- s překrývajícím se termínem. Statusy completed/cancelled neblokují.
-- Funkce je security definer, aby mohla číst reservations i pro anonymního klienta.
create or replace function public.prevent_overlapping_reservations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date;
  v_end date;
  v_status text;
begin
  select r.start_date, r.end_date, r.status
    into v_start, v_end, v_status
    from public.reservations r
   where r.id = new.reservation_id;

  if v_status in ('pending', 'reserved', 'occupied') then
    if exists (
      select 1
        from public.reservation_items ri
        join public.reservations r on r.id = ri.reservation_id
       where ri.bike_variant_id = new.bike_variant_id
         and ri.id <> new.id
         and r.status in ('pending', 'reserved', 'occupied')
         and r.start_date <= v_end
         and r.end_date >= v_start
    ) then
      raise exception 'Toto kolo (varianta) je v daném termínu již rezervované.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_overlap on public.reservation_items;
create trigger trg_prevent_overlap
  after insert or update on public.reservation_items
  for each row execute function public.prevent_overlapping_reservations();

-- ---------- Pomocné funkce pro výpočet slev (serverová validace cen) ----------
-- Sezónní sleva (%) pro dnešní datum (stejná logika jako lib/pricing.ts).
create or replace function public.seasonal_discount_pct()
returns numeric
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(d.value), 0)
  from public.discounts d
  where d.type = 'seasonal'
    and d.active
    and (d.start_date is null or d.start_date <= current_date)
    and (d.end_date is null or d.end_date >= current_date)
$$;

-- Množstevní sleva (%) pro daný počet dní – nejvyšší min_days, který platí
-- (stejná logika jako lib/pricing.ts: řazení podle min_days desc, první).
create or replace function public.multi_day_discount_pct(p_days integer)
returns numeric
language sql
security definer
set search_path = public
as $$
  select coalesce(d.value, 0)
  from public.discounts d
  where d.type = 'multi_day'
    and d.active
    and d.min_days is not null
    and p_days >= d.min_days
  order by d.min_days desc
  limit 1
$$;

-- ---------- Transakční vytvoření rezervace (veřejný formulář) ----------
-- Vytvoří rezervaci + položky v JEDNÉ transakci. Před vložením zkontroluje
-- překryv termínů (stejná logika jako trigger výše), takže při konfliktu
-- v DB nezůstane osiřelá rezervace bez položek.
--
-- BEZPEČNOST: ceny (p_total_price, p_discount_amount, price_per_day, subtotal)
-- se od klienta NEpřebírají – počítají se na serveru z aktuálních cen v DB
-- (bikes.base_price_per_day) a aktivních slev (discounts). Klient tak nemůže
-- rezervovat kolo za upravenou cenu.
create or replace function public.create_reservation(
  p_reservation_number text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_customer_address text,
  p_start_date date,
  p_end_date date,
  p_total_price numeric,      -- IGNOROVÁNO – cena se počítá na serveru
  p_discount_amount numeric,  -- IGNOROVÁNO – sleva se počítá na serveru
  p_notes text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation_id uuid;
  v_item jsonb;
  v_variant_id uuid;
  v_base_per_day numeric;
  v_bike_name text;
  v_color text;
  v_size text;
  v_days integer;
  v_seasonal_pct numeric;
  v_multi_pct numeric;
  v_base_total numeric;
  v_after_seasonal numeric;
  v_item_total numeric;
  v_seasonal_disc numeric;
  v_multi_disc numeric;
  v_total_price numeric := 0;
  v_discount_amount numeric := 0;
begin
  -- Základní validace vstupů
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Rezervace musí obsahovat alespoň jedno kolo.';
  end if;
  if p_start_date > p_end_date then
    raise exception 'Neplatný termín rezervace.';
  end if;
  if p_customer_name is null or trim(p_customer_name) = '' then
    raise exception 'Chybí jméno zákazníka.';
  end if;
  if p_customer_phone is null or trim(p_customer_phone) = '' then
    raise exception 'Chybí telefon zákazníka.';
  end if;
  if p_customer_email is null or p_customer_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Neplatný e-mail zákazníka.';
  end if;

  -- Rate limiting: max 5 rezervací za hodinu z jedné e-mailové adresy
  if (select count(*) from public.reservations r
      where r.customer_email = p_customer_email
        and r.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Příliš mnoho rezervací z jedné e-mailové adresy. Zkuste to prosím později.';
  end if;

  v_days := (p_end_date - p_start_date) + 1;
  v_seasonal_pct := public.seasonal_discount_pct();
  v_multi_pct := public.multi_day_discount_pct(v_days);

  -- Kontrola překryvu termínů pro každou variantu v košíku
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item->>'bike_variant_id')::uuid;
    if exists (
      select 1
        from public.reservation_items ri
        join public.reservations r on r.id = ri.reservation_id
       where ri.bike_variant_id = v_variant_id
         and r.status in ('pending', 'reserved', 'occupied')
         and r.start_date <= p_end_date
         and r.end_date >= p_start_date
    ) then
      raise exception 'Kolo je v tomto termínu již rezervované.';
    end if;
  end loop;

  insert into public.reservations (
    reservation_number, customer_name, customer_email, customer_phone,
    customer_address, start_date, end_date, status, total_price, discount_amount, notes
  ) values (
    p_reservation_number, p_customer_name, p_customer_email, p_customer_phone,
    p_customer_address, p_start_date, p_end_date, 'pending', 0, 0, p_notes
  )
  returning id into v_reservation_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_variant_id := (v_item->>'bike_variant_id')::uuid;

    -- Ověření varianty + načtení SKUTEČNÉ ceny z DB (ne z klienta!)
    select b.base_price_per_day, b.name, bv.color, bv.size
      into v_base_per_day, v_bike_name, v_color, v_size
      from public.bike_variants bv
      join public.bikes b on b.id = bv.bike_id
     where bv.id = v_variant_id
       and bv.active
       and b.active;

    if not found then
      raise exception 'Vybrané kolo (varianta) není dostupné.';
    end if;

    -- Výpočet ceny (stejná logika jako lib/pricing.ts):
    -- cena = (cena/den × dny × (1 − sezónní/100)) × (1 − množstevní/100)
    v_base_total := v_base_per_day * v_days;
    v_after_seasonal := v_base_total * (1 - v_seasonal_pct / 100);
    v_item_total := round(v_after_seasonal * (1 - v_multi_pct / 100));
    v_seasonal_disc := round(v_base_total * (v_seasonal_pct / 100));
    v_multi_disc := round(v_after_seasonal * (v_multi_pct / 100));

    v_total_price := v_total_price + v_item_total;
    v_discount_amount := v_discount_amount + v_seasonal_disc + v_multi_disc;

    insert into public.reservation_items (
      reservation_id, bike_variant_id, bike_name, variant_label, price_per_day, days, subtotal
    ) values (
      v_reservation_id,
      v_variant_id,
      v_bike_name,
      trim(v_color || ' / ' || v_size),
      v_base_per_day,
      v_days,
      v_base_total
    );
  end loop;

  update public.reservations
     set total_price = v_total_price,
         discount_amount = v_discount_amount
   where id = v_reservation_id;

  return jsonb_build_object('id', v_reservation_id, 'reservation_number', p_reservation_number);
end;
$$;

grant execute on function public.create_reservation(
  text, text, text, text, text, date, date, numeric, numeric, text, jsonb
) to anon, authenticated;

-- ---------- RLS: aktivace ----------
alter table public.bikes enable row level security;
alter table public.bike_variants enable row level security;
alter table public.photos enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_items enable row level security;
alter table public.discounts enable row level security;
alter table public.settings enable row level security;
alter table public.profiles enable row level security;

-- ---------- RLS: bikes ----------
drop policy if exists "bikes_public_read" on public.bikes;
create policy "bikes_public_read" on public.bikes
  for select using (active = true);

drop policy if exists "bikes_admin_all" on public.bikes;
create policy "bikes_admin_all" on public.bikes
  for all using (public.is_admin());

-- ---------- RLS: bike_variants ----------
drop policy if exists "variants_public_read" on public.bike_variants;
create policy "variants_public_read" on public.bike_variants
  for select using (active = true);

drop policy if exists "variants_admin_all" on public.bike_variants;
create policy "variants_admin_all" on public.bike_variants
  for all using (public.is_admin());

-- ---------- RLS: photos ----------
drop policy if exists "photos_public_read" on public.photos;
create policy "photos_public_read" on public.photos
  for select using (true);

drop policy if exists "photos_admin_all" on public.photos;
create policy "photos_admin_all" on public.photos
  for all using (public.is_admin());

-- ---------- RLS: discounts ----------
drop policy if exists "discounts_public_read" on public.discounts;
create policy "discounts_public_read" on public.discounts
  for select using (active = true);

drop policy if exists "discounts_admin_all" on public.discounts;
create policy "discounts_admin_all" on public.discounts
  for all using (public.is_admin());

-- ---------- RLS: reservations ----------
-- Veřejnost (anon) může vytvořit rezervaci JEN ve statusu 'pending' –
-- statusy reserved/occupied může nastavit pouze pracovník/admin.
drop policy if exists "reservations_public_insert" on public.reservations;
create policy "reservations_public_insert" on public.reservations
  for insert to anon with check (status = 'pending');

-- Pracovník/admin: ruční vytvoření rezervace s libovolným statusem
drop policy if exists "reservations_worker_insert" on public.reservations;
create policy "reservations_worker_insert" on public.reservations
  for insert to authenticated with check (public.is_worker());

-- Pracovník a admin: čtení a změna statusu rezervací
drop policy if exists "reservations_worker_select" on public.reservations;
create policy "reservations_worker_select" on public.reservations
  for select using (public.is_worker());

drop policy if exists "reservations_worker_update" on public.reservations;
create policy "reservations_worker_update" on public.reservations
  for update using (public.is_worker());

-- Admin: plná správa (výmaz atd.)
drop policy if exists "reservations_admin_delete" on public.reservations;
create policy "reservations_admin_delete" on public.reservations
  for delete using (public.is_admin());

-- ---------- RLS: reservation_items ----------
-- Pomocná funkce pro RLS: je rezervace ve statusu 'pending'?
-- (security definer, aby dotaz na reservations nepodléhal RLS a nezpůsobil rekurzi)
create or replace function public.reservation_is_pending(p_reservation_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.reservations r
    where r.id = p_reservation_id and r.status = 'pending'
  )
$$;

-- Veřejnost (anon): položku může vložit jen k rezervaci ve statusu 'pending'
drop policy if exists "items_public_insert" on public.reservation_items;
create policy "items_public_insert" on public.reservation_items
  for insert to anon with check (public.reservation_is_pending(reservation_id));

-- Pracovník/admin: položky k libovolné rezervaci (ruční vytvoření)
drop policy if exists "items_worker_insert" on public.reservation_items;
create policy "items_worker_insert" on public.reservation_items
  for insert to authenticated with check (public.is_worker());

drop policy if exists "items_worker_select" on public.reservation_items;
create policy "items_worker_select" on public.reservation_items
  for select using (public.is_worker());

drop policy if exists "items_admin_all" on public.reservation_items;
create policy "items_admin_all" on public.reservation_items
  for all using (public.is_admin());

-- ---------- RLS: settings ----------
drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read" on public.settings
  for select using (true);

drop policy if exists "settings_admin_all" on public.settings;
create policy "settings_admin_all" on public.settings
  for all using (public.is_admin());

-- ---------- RLS: profiles ----------
drop policy if exists "profiles_worker_select" on public.profiles;
create policy "profiles_worker_select" on public.profiles
  for select using (public.is_worker());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin());

-- ---------- Trigger: automatické vytvoření profilu po přihlašení ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'worker')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Startovní data: nastavení ----------
insert into public.settings (key, value) values
  ('require_admin_confirmation', 'true'),
  ('bank_account', '123456789/0100'),
  ('bank_iban', 'CZ0000000000000000000000'),
  ('bank_swift', 'KOMBCZPP'),
  ('bank_beneficiary', 'Bike Gallery')
on conflict (key) do nothing;

-- ---------- Startovní data: slevy ----------
insert into public.discounts (name, type, value, min_days, active) values
  ('Množstevní sleva 3+ dní', 'multi_day', 10, 3, true),
  ('Množstevní sleva 7+ dní', 'multi_day', 20, 7, true)
on conflict (id) do nothing;