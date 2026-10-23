-- =====================================================================
-- Flod migration 0004: Realtime for money_requests
-- Run after 0003. Safe to re-run.
--
-- Lets Supabase Realtime tell open screens when a request is created or
-- answered. Row Level Security still decides WHO receives each change:
-- before sending a change to a screen, Realtime checks that user's SELECT
-- policy, so a stranger's screen never hears about someone else's request.
-- =====================================================================

-- "supabase_realtime" is the publication (list of tables whose changes are
-- reported) that every Supabase project already has. Plain
-- "alter publication ... add table" fails if the table is already in it,
-- so only add it when it is missing.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'money_requests'
  ) then
    alter publication supabase_realtime add table public.money_requests;
  end if;
end
$$;

-- Check (optional): should return one row.
-- select pubname, schemaname, tablename from pg_publication_tables
-- where tablename = 'money_requests';
