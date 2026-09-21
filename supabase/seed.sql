-- ============================================================
-- Bike Gallery Půjčovna — Seed data (kola z bikegallery.cz)
-- Spusťte v Supabase SQL Editor po schema.sql
-- ============================================================

-- ---------- Kola (modely) ----------
insert into public.bikes (id, slug, name, brand, short_description, long_description, base_price_per_day, active, sort_order) values
  ('00000000-0000-0000-0000-000000000001', 'cannondale-topstone-2', 'Cannondale Topstone 2', 'Cannondale',
   'Univerzální hliníkový gravel pro každodenní dobrodružství.',
   'Cannondale Topstone 2 je ten pravý gravel bike pro vaše dobrodružství. Komfortní geometrie, hliníkový rám a spolehlivá výbava ho předurčují na dlouhé výlety po šotolině i asfaltu.',
   800, true, 1),

  ('00000000-0000-0000-0000-000000000002', 'ridley-kanzo-adventure-alu', 'Ridley Kanzo Adventure Alu', 'Ridley',
   'Gravel kolo Ridley Kanzo Adventure Alu — univerzál na cesty i bikepacking.',
   'Kanzo Adventure je navrženo pro dobrodružství. Hliníkový rám s možností montáže brašen, komfortní geometrie a široké pláště z něj dělají ideálního parťáka na vícedenní výpravy.',
   900, true, 2),

  ('00000000-0000-0000-0000-000000000003', 'rondo-ruut-al-2', 'Rondo Ruut AL 2', 'Rondo',
   'Polský gravel s unikátní vidlicí Twin-Tip pro maximální univerzálnost.',
   'Rondo Ruut AL 2 je skvělý vstup do světa gravelu. Díky vidlici Twin-Tip si můžete měnit geometrii podle terénu — od závodní po pohodlnou.',
   700, true, 3),

  ('00000000-0000-0000-0000-000000000004', 'superior-xr-6-5-gr', 'Superior XR 6.5 GR', 'Superior',
   'Univerzální hliníkový gravel pro spolehlivost a komfort na dlouhé trasy.',
   'Superior XR 6.5 GR je univerzální hliníkový gravel určený pro jezdce, kteří hledají spolehlivost a komfort na dlouhé trasy. Skvělý poměr ceny a výkonu.',
   800, true, 4),

  ('00000000-0000-0000-0000-000000000005', 'ridley-astr-grx600', 'Ridley ASTR GRX600', 'Ridley',
   'Závodní gravel kolo Ridley ASTR s osvědčenou sadou Shimano GRX.',
   'ASTR přináší všechny vlastnosti ASTR RS za dostupnější cenu: aerodynamická vylepšení a moderní gravel geometrie. Kolo je rychlé, ale zároveň pohodlné na dlouhé jízdy.',
   1000, true, 5),

  ('00000000-0000-0000-0000-000000000006', 'ridley-astr-apex-axs', 'Ridley ASTR Apex AXS', 'Ridley',
   'Závodní gravel kolo Ridley ASTR s bezdrátovou sadou SRAM Apex AXS.',
   'Závodní gravel kolo Ridley ASTR s bezdrátovým řazením SRAM Apex AXS. Lehký karbonový rám a moderní geometrie pro rychlé i pohodlné jízdy.',
   1200, true, 6),

  ('00000000-0000-0000-0000-000000000007', 'ridley-astr-grx800-di2', 'Ridley ASTR GRX800 Di2', 'Ridley',
   'Výkonnostní gravel kolo Ridley ASTR s elektronickým řazením Shimano GRX Di2.',
   'Výkonnostní gravel kolo Ridley ASTR s elektronickým řazením Shimano GRX Di2. Špičkový výkon a přesné řazení pro náročné jezdce.',
   1500, true, 7),

  ('00000000-0000-0000-0000-000000000008', 'ridley-astr-rival-xplr', 'Ridley ASTR Rival XPLR', 'Ridley',
   'Výkonnostní gravel kolo Ridley ASTR s bezdrátovou sadou SRAM Rival XPLR.',
   'Výkonnostní gravel kolo Ridley ASTR s bezdrátovou sadou SRAM Rival XPLR AXS. Ideální volba pro náročné gravel jezdce.',
   1300, true, 8),

  ('00000000-0000-0000-0000-000000000009', 'ridley-astr-rs-force-xplr', 'Ridley ASTR RS Force XPLR', 'Ridley',
   'Výkonnostní gravel bike Ridley ASTR RS s prémiovou sadou SRAM Force XPLR.',
   'Výkonnostní gravel bike Ridley ASTR RS s prémiovou bezdrátovou sadou SRAM Force XPLR AXS. Špičkový karbon a závodní výkon.',
   1800, true, 9),

  ('00000000-0000-0000-0000-00000000000a', 'ridley-grevil-f3', 'Ridley Grevil F3', 'Ridley',
   'Nová generace kola Grevil F — lehčí, rychlejší a navržena pro celodenní jízdu.',
   'Nová generace kola Grevil F je lehčí, rychlejší a navržena pro celodenní jízdu. Sada SRAM Apex XPLR a karbonový rám.',
   1300, true, 10),

  ('00000000-0000-0000-0000-00000000000b', 'ridley-grevil-f5', 'Ridley Grevil F5', 'Ridley',
   'Nová generace kola Grevil F s bezdrátovou sadou SRAM Rival XPLR AXS.',
   'Nová generace kola Grevil F je lehčí, rychlejší a navržena pro celodenní jízdu. Bezdrátová sada SRAM Rival XPLR AXS.',
   1600, true, 11),

  ('00000000-0000-0000-0000-00000000000c', 'pinarello-dogma-gr', 'Pinarello Dogma GR', 'Pinarello',
   'Dokonalá kombinace rychlosti a terénní síly od italské legendy.',
   'Dokonalá kombinace rychlosti a terénní síly. Pinarello Dogma GR je vrcholný gravel bike s prémiovou výbavou a závodní geometrií.',
   3000, true, 12)
on conflict (id) do nothing;

-- ---------- Varianty (barva / velikost) ----------
insert into public.bike_variants (bike_id, color, size, active) values
  -- Cannondale Topstone 2
  ('00000000-0000-0000-0000-000000000001', 'Černá', 'S', true),
  ('00000000-0000-0000-0000-000000000001', 'Černá', 'M', true),
  ('00000000-0000-0000-0000-000000000001', 'Černá', 'L', true),
  -- Ridley Kanzo Adventure Alu
  ('00000000-0000-0000-0000-000000000002', 'Jazzberry Jam Metallic/Black', 'XXS', true),
  ('00000000-0000-0000-0000-000000000002', 'Jazzberry Jam Metallic/Black', 'M', true),
  ('00000000-0000-0000-0000-000000000002', 'Jazzberry Jam Metallic/Black', 'L', true),
  -- Rondo Ruut AL 2
  ('00000000-0000-0000-0000-000000000003', 'Hydro Green/Black', 'S', true),
  ('00000000-0000-0000-0000-000000000003', 'Hydro Green/Black', 'M', true),
  ('00000000-0000-0000-0000-000000000003', 'Hydro Green/Black', 'L', true),
  -- Superior XR 6.5 GR
  ('00000000-0000-0000-0000-000000000004', 'Gloss Black', 'M', true),
  ('00000000-0000-0000-0000-000000000004', 'Gloss Sand/Matt Sand', 'L', true),
  -- Ridley ASTR GRX600
  ('00000000-0000-0000-0000-000000000005', 'Black Metallic/Bronze Gold', 'M', true),
  ('00000000-0000-0000-0000-000000000005', 'Empress Grey/Anthracite Metallic', 'L', true),
  ('00000000-0000-0000-0000-000000000005', 'Storm Green Metallic/Lime Green', 'M', true),
  -- Ridley ASTR Apex AXS
  ('00000000-0000-0000-0000-000000000006', 'Black Metallic/Bronze Gold', 'L', true),
  ('00000000-0000-0000-0000-000000000006', 'Empress Grey/Anthracite Metallic', 'M', true),
  -- Ridley ASTR GRX800 Di2
  ('00000000-0000-0000-0000-000000000007', 'Black Metallic/Bronze Gold', 'M', true),
  ('00000000-0000-0000-0000-000000000007', 'Storm Green Metallic/Lime Green', 'M', true),
  -- Ridley ASTR Rival XPLR
  ('00000000-0000-0000-0000-000000000008', 'Black Metallic/Bronze Gold', 'L', true),
  ('00000000-0000-0000-0000-000000000008', 'Empress Grey/Anthracite Metallic', 'XS', true),
  -- Ridley ASTR RS Force XPLR
  ('00000000-0000-0000-0000-000000000009', 'Crocodile Green/UD Carbon', 'S', true),
  ('00000000-0000-0000-0000-000000000009', 'Raw Sugar/Black', 'L', true),
  -- Ridley Grevil F3
  ('00000000-0000-0000-0000-00000000000a', 'Černá', 'M', true),
  ('00000000-0000-0000-0000-00000000000a', 'Černá', 'L', true),
  -- Ridley Grevil F5
  ('00000000-0000-0000-0000-00000000000b', 'Černá', 'M', true),
  ('00000000-0000-0000-0000-00000000000b', 'Černá', 'L', true),
  -- Pinarello Dogma GR
  ('00000000-0000-0000-0000-00000000000c', 'Černá', 'M', true),
  ('00000000-0000-0000-0000-00000000000c', 'Černá', 'L', true)
on conflict (id) do nothing;

-- ---------- Fotky (hlavní fotka per kolo) ----------
insert into public.photos (bike_id, url, alt, is_main, sort_order) values
  ('00000000-0000-0000-0000-000000000001', 'https://cdn.myshoptet.com/usr/www.bikegallery.cz/user/shop/big/62535_cannondale-topstone-2-cues-1x.jpg?ff=1&x=1024&y=768&q=85&ts=68540312&sg=161563f2', 'Cannondale Topstone 2', true, 0),
  ('00000000-0000-0000-0000-000000000002', 'https://cdn.myshoptet.com/usr/www.bikegallery.cz/user/shop/big/76827_ridley-kolo-kanzo-adventure-alu-grx600-jazzberry-jam-metallic-black--size-xxs.jpg?ff=1&x=1024&y=768&q=85&ts=6a9be44c&sg=161563f2', 'Ridley Kanzo Adventure Alu', true, 0),
  ('00000000-0000-0000-0000-000000000003', 'https://cdn.myshoptet.com/usr/www.bikegallery.cz/user/shop/big/62946_snimek-obrazovky-2025-08-25-120125.png?ff=1&x=1024&y=768&q=85&ts=68ac355e&sg=161563f2', 'Rondo Ruut AL 2', true, 0),
  ('00000000-0000-0000-0000-000000000004', 'https://cdn.myshoptet.com/usr/www.bikegallery.cz/user/shop/big/76830-1_kolo-suerior-xr-6-5-gr-gloss-black.webp?ff=1&x=1024&y=768&q=85&ts=6a9bed43&sg=161563f2', 'Superior XR 6.5 GR', true, 0),
  ('00000000-0000-0000-0000-000000000005', 'https://cdn.myshoptet.com/usr/www.bikegallery.cz/user/shop/big/67198-1_kolo-ridley-astr-grx600-1x12.jpg?ff=1&x=1024&y=768&q=85&ts=69fcdc67&sg=161563f2', 'Ridley ASTR GRX600', true, 0),
  ('00000000-0000-0000-0000-000000000006', 'https://cdn.myshoptet.com/usr/www.bikegallery.cz/user/shop/big/76058_ridley-kolo-astr-apex-axs-black-metallic-bronze-gold--size-l.jpg?ff=1&x=1024&y=768&q=85&ts=6a69266f&sg=161563f2', 'Ridley ASTR Apex AXS', true, 0),
  ('00000000-0000-0000-0000-000000000007', 'https://cdn.myshoptet.com/usr/www.bikegallery.cz/user/shop/big/76115_ridley-kolo-astr-grx800-di2-black-metallic-bronze-gold--size-700--m.jpg?ff=1&x=1024&y=768&q=85&ts=6a68af95&sg=161563f2', 'Ridley ASTR GRX800 Di2', true, 0),
  ('00000000-0000-0000-0000-000000000008', 'https://cdn.myshoptet.com/usr/www.bikegallery.cz/user/shop/big/74540_ridley-kolo-astr-rival-1x12-xplr-black-metallic-bronze-gold--size-m.jpg?ff=1&x=1024&y=768&q=85&ts=6a7b9b70&sg=161563f2', 'Ridley ASTR Rival XPLR', true, 0),
  ('00000000-0000-0000-0000-000000000009', 'https://cdn.myshoptet.com/usr/www.bikegallery.cz/user/shop/big/76142_ridley-kolo-astr-rs-force-xplr-1x13-crocodile-green-ud-carbon--size-700--s.jpg?ff=1&x=1024&y=768&q=85&ts=6a68af95&sg=161563f2', 'Ridley ASTR RS Force XPLR', true, 0),
  ('00000000-0000-0000-0000-00000000000a', 'https://cdn.myshoptet.com/usr/www.bikegallery.cz/user/shop/big/62832_dogma1111.png?ff=1&x=1024&y=768&q=85&ts=688a1037&sg=161563f2', 'Ridley Grevil F3', true, 0),
  ('00000000-0000-0000-0000-00000000000b', 'https://cdn.myshoptet.com/usr/www.bikegallery.cz/user/shop/big/62838_dogma11.png?ff=1&x=1024&y=768&q=85&ts=688a0e8d&sg=161563f2', 'Ridley Grevil F5', true, 0),
  ('00000000-0000-0000-0000-00000000000c', 'https://cdn.myshoptet.com/usr/www.bikegallery.cz/user/shop/big/62850_dogma1.png?ff=1&x=1024&y=768&q=85&ts=688a0170&sg=161563f2', 'Pinarello Dogma GR', true, 0)
on conflict (id) do nothing;