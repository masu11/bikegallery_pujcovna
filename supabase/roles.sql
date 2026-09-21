-- ============================================================
-- Správa rolí adminů a pracovníků
-- Spusťte v Supabase SQL Editor
-- ============================================================

-- Nastavit admina (nahraďte e-mailem uživatele)
update public.profiles set role = 'admin' where email = 'marcel.suchomel@gmail.com';

-- Nastavit pracovníka (nahraďte e-mailem uživatele)
-- update public.profiles set role = 'worker' where email = 'pracovnik@email.cz';

-- Zobrazit všechny uživatele a role
-- select p.email, p.role, p.created_at from public.profiles p order by p.created_at desc;