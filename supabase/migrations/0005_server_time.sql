-- =====================================================================
-- Flod migration 0005: tell the app the database's current time
-- Run after 0004. Safe to re-run (CREATE OR REPLACE).
--
-- Why? Deadlines (expires_at) are set by the database clock, but countdowns
-- are drawn by the phone. A phone whose clock is 5 minutes slow would show
-- "6:00 left" for a request that really has 1 minute. The app asks for the
-- database's time once and corrects its countdowns by the difference.
--
-- This changes nothing about security: the database still decides whether
-- an answer is late (respond_to_request checks expires_at > now() itself).
-- =====================================================================

create or replace function public.server_now()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select now();
$$;

-- Signed-in users only, like every other function (Supabase grants anon by default).
revoke execute on function public.server_now() from public, anon;
grant execute on function public.server_now() to authenticated;
