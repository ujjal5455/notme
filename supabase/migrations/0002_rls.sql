-- =====================================================================
-- Flod migration 0002: Row Level Security (who may READ which rows)
-- Run after 0001. Safe to re-run (policies are dropped and recreated).
--
-- GOLDEN RULE: reads go through RLS; writes go ONLY through the
-- functions in 0003. So signed-in users get SELECT and nothing else.
-- =====================================================================

-- 1. Turn RLS on. With RLS on and no matching policy, a role sees ZERO rows.
alter table public.profiles       enable row level security;
alter table public.family_links   enable row level security;
alter table public.pairing_codes  enable row level security;
alter table public.money_requests enable row level security;

-- 2. Least privilege at the table level too (defence in depth).
-- Supabase gives the API roles broad default rights on new tables.
-- Take them all away, then give back only SELECT to signed-in users.
-- Logged-out visitors (anon) get nothing at all.
revoke all on public.profiles, public.family_links, public.pairing_codes, public.money_requests
  from anon, authenticated;
grant select on public.profiles, public.family_links, public.pairing_codes, public.money_requests
  to authenticated;

-- 3. Policies. "(select auth.uid())" = the signed-in user's id, taken from
-- their login token. Wrapping it in "select" lets Postgres compute it once
-- per query instead of once per row.

-- profiles ------------------------------------------------------------
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles: read linked person" on public.profiles;
create policy "profiles: read linked person"
  on public.profiles for select to authenticated
  using (
    exists (
      select 1 from public.family_links l
      where (l.elder_id = (select auth.uid()) and l.family_id = profiles.id)
         or (l.family_id = (select auth.uid()) and l.elder_id = profiles.id)
    )
  );

-- family_links --------------------------------------------------------
drop policy if exists "family_links: read if member" on public.family_links;
create policy "family_links: read if member"
  on public.family_links for select to authenticated
  using (elder_id = (select auth.uid()) or family_id = (select auth.uid()));

-- pairing_codes -------------------------------------------------------
-- Only the elder who created a code can see it. Family members never
-- browse codes; they can only redeem one they were shown in person.
drop policy if exists "pairing_codes: read own" on public.pairing_codes;
create policy "pairing_codes: read own"
  on public.pairing_codes for select to authenticated
  using (elder_id = (select auth.uid()));

-- money_requests ------------------------------------------------------
-- Visible ONLY to the elder who made it and the family member it was
-- sent to. A third account sees nothing.
drop policy if exists "money_requests: read if elder or assigned family" on public.money_requests;
create policy "money_requests: read if elder or assigned family"
  on public.money_requests for select to authenticated
  using (elder_id = (select auth.uid()) or family_id = (select auth.uid()));

-- Deliberately NO insert / update / delete policies on any table.
