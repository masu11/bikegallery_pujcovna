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
-- Klient může vytvořit rezervaci (bez přihlašování)
drop policy if exists "reservations_public_insert" on public.reservations;
create policy "reservations_public_insert" on public.reservations
  for insert with check (true);

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
drop policy if exists "items_public_insert" on public.reservation_items;
create policy "items_public_insert" on public.reservation_items
  for insert with check (true);

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