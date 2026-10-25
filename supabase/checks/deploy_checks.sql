-- =====================================================================
-- Notme: pre-demo / pre-deployment configuration check (READ-ONLY)
-- Paste into Supabase → SQL Editor → Run. It changes nothing.
-- Every row should say PASS. Complements rls_checks.sql, which tests
-- behaviour by acting as different users; this one inspects settings.
-- =====================================================================

with
-- Tables the app may READ (through RLS).
tables(name) as (
  values ('profiles'), ('family_links'), ('pairing_codes'), ('money_requests')
),
-- Tables app users may not touch at all (0007): only server-side code reads them.
private_tables(name) as (
  values ('push_tokens')
),
fns(name, definer) as (
  values ('create_my_profile', true), ('create_pairing_code', true),
         ('redeem_pairing_code', true), ('create_money_request', true),
         ('respond_to_request', true), ('server_now', false),
         ('register_push_token', true), ('unregister_push_token', true)
),
checks(check_name, ok, detail) as (
  -- 1. Row Level Security is on for every Notme table.
  select 'RLS enabled: ' || t.name,
         coalesce(c.relrowsecurity, false),
         case when c.oid is null then 'table missing' else 'rls = ' || c.relrowsecurity end
  from (select name from tables union all select name from private_tables) t
  left join pg_class c on c.relname = t.name and c.relkind = 'r'
       and c.relnamespace = 'public'::regnamespace

  union all
  -- 2. Logged-out visitors (anon) have no table rights at all.
  select 'anon has no rights on: ' || t.name,
         not exists (select 1 from information_schema.role_table_grants g
                     where g.table_schema = 'public' and g.table_name = t.name and g.grantee = 'anon'),
         coalesce((select string_agg(privilege_type, ', ') from information_schema.role_table_grants g
                   where g.table_schema = 'public' and g.table_name = t.name and g.grantee = 'anon'), 'none')
  from (select name from tables union all select name from private_tables) t

  union all
  -- 2b. Signed-in users have no rights at all on private tables (0007).
  select 'authenticated has no rights on: ' || t.name,
         not exists (select 1 from information_schema.role_table_grants g
                     where g.table_schema = 'public' and g.table_name = t.name and g.grantee = 'authenticated'),
         coalesce((select string_agg(privilege_type, ', ') from information_schema.role_table_grants g
                   where g.table_schema = 'public' and g.table_name = t.name and g.grantee = 'authenticated'), 'none')
  from private_tables t

  union all
  -- 3. Signed-in users may only READ tables (writes go through functions).
  select 'authenticated may only SELECT: ' || t.name,
         coalesce((select array_agg(privilege_type::text order by privilege_type) from information_schema.role_table_grants g
                   where g.table_schema = 'public' and g.table_name = t.name and g.grantee = 'authenticated'),
                  '{}') = array['SELECT'],
         coalesce((select string_agg(privilege_type, ', ') from information_schema.role_table_grants g
                   where g.table_schema = 'public' and g.table_name = t.name and g.grantee = 'authenticated'), 'none')
  from tables t

  union all
  -- 4. No policy allows INSERT, UPDATE or DELETE.
  select 'only SELECT policies',
         not exists (select 1 from pg_policies p where p.schemaname = 'public'
                     and p.tablename in (select name from tables) and p.cmd <> 'SELECT'),
         coalesce((select string_agg(p.tablename || ':' || p.cmd, ', ') from pg_policies p
                   where p.schemaname = 'public' and p.tablename in (select name from tables)
                     and p.cmd <> 'SELECT'), 'none')

  union all
  -- 4b. Private tables have no policies at all (0007).
  select 'no policies on private table: ' || t.name,
         not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.name),
         coalesce((select string_agg(p.policyname, ', ') from pg_policies p
                   where p.schemaname = 'public' and p.tablename = t.name), 'none')
  from private_tables t

  union all
  -- 5. Each function exists; anon can't call it; signed-in users can.
  select 'function callable only when signed in: ' || f.name,
         p.oid is not null
           and not has_function_privilege('anon', p.oid, 'execute')
           and has_function_privilege('authenticated', p.oid, 'execute'),
         case when p.oid is null then 'function missing (run the migrations)'
              else 'anon=' || has_function_privilege('anon', p.oid, 'execute')
                   || ', authenticated=' || has_function_privilege('authenticated', p.oid, 'execute') end
  from fns f
  left join pg_proc p on p.proname = f.name and p.pronamespace = 'public'::regnamespace

  union all
  -- 6. Write functions run as owner AND pin search_path; server_now does not need owner rights.
  select 'function security settings: ' || f.name,
         p.oid is not null and p.prosecdef = f.definer
           and coalesce(array_to_string(p.proconfig, ','), '') like '%search_path=%',
         case when p.oid is null then 'function missing'
              else 'security definer=' || p.prosecdef || ', config=' || coalesce(array_to_string(p.proconfig, ','), 'none') end
  from fns f
  left join pg_proc p on p.proname = f.name and p.pronamespace = 'public'::regnamespace

  union all
  -- 7. Live updates are switched on for money_requests (0004).
  select 'Realtime publishes money_requests',
         exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'money_requests'),
         'publication supabase_realtime'

  union all
  -- 8. Amount-only requests (0006): no payee or note is stored ...
  select 'amount-only: money_requests has no recipient or note column',
         not exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'money_requests'
                       and column_name in ('recipient', 'note')),
         coalesce((select string_agg(column_name, ', ') from information_schema.columns
                   where table_schema = 'public' and table_name = 'money_requests'
                     and column_name in ('recipient', 'note')), 'none')

  union all
  -- 10. 0008: the column the send-alert function uses to send at most once.
  select 'alert: money_requests has alert_sent_at (0008)',
         exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'money_requests'
                   and column_name = 'alert_sent_at'),
         'run 0008_alert_sent.sql if missing'

  union all
  -- 9. ... and the old create_money_request that accepted them is gone.
  select 'amount-only: old create_money_request(amount, recipient, note, timeout) removed',
         to_regprocedure('public.create_money_request(integer, text, text, integer)') is null,
         'versions found: ' || coalesce((select string_agg(pg_get_function_identity_arguments(p.oid), ' | ')
                                         from pg_proc p
                                         where p.proname = 'create_money_request'
                                           and p.pronamespace = 'public'::regnamespace), 'none')
)
select case when ok then 'PASS' else 'FAIL' end as result, check_name, detail
from checks
order by ok, check_name;
-- FAIL rows are listed first.
