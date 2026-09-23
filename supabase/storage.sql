-- ============================================================
-- Bike Gallery Půjčovna — Supabase Storage (fotky kol)
-- Spusťte v Supabase SQL Editor PO schema.sql (stačí jednou)
-- ============================================================

-- Vytvoření veřejného bucketu pro fotky kol (pokud ještě neexistuje)
insert into storage.buckets (id, name, public)
values ('bike-photos', 'bike-photos', true)
on conflict (id) do nothing;

-- ---------- RLS politiky pro storage.objects ----------

-- Veřejné čtení: fotky se zobrazují na webu bez přihlášení
drop policy if exists "bike_photos_public_read" on storage.objects;
create policy "bike_photos_public_read" on storage.objects
  for select using (bucket_id = 'bike-photos');

-- Nahrávání: pouze přihlášený admin (role 'admin' v public.profiles)
drop policy if exists "bike_photos_admin_insert" on storage.objects;
create policy "bike_photos_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'bike-photos' and public.is_admin());

-- Úprava (překrytí souboru): pouze admin
drop policy if exists "bike_photos_admin_update" on storage.objects;
create policy "bike_photos_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'bike-photos' and public.is_admin());

-- Mazání: pouze admin
drop policy if exists "bike_photos_admin_delete" on storage.objects;
create policy "bike_photos_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'bike-photos' and public.is_admin());