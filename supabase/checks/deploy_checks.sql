-- =====================================================================
-- Flod: pre-demo / pre-deployment configuration check (READ-ONLY)
-- Paste into Supabase → SQL Editor → Run. It changes nothing.
-- Every row should say PASS. Complements rls_checks.sql, which tests
-- behaviour by acting as different users; this one inspects settings.
-- =====================================================================

with
tables(name) as (
  values ('profiles'), ('family_links'), ('pairing_codes'), ('money_requests')
),
fns(name, definer) as (
  values ('create_my_profile', true), ('create_pairing_code', true),
         ('redeem_pairing_code', true), ('create_money_request', true),
         ('respond_to_request', true), ('server_now', false)
),
checks(check_name, ok, detail) as (
  -- 1. Row Level Security is on for every Flod table.
  select 'RLS enabled: ' || t.name,
         coalesce(c.relrowsecurity, false),
         case when c.oid is null then 'table missing' else 'rls = ' || c.relrowsecurity end
  from tables t
  left join pg_class c on c.relname = t.name and c.relkind = 'r'
       and c.relnamespace = 'public'::regnamespace

  union all
  -- 2. Logged-out visitors (anon) have no table rights at all.
  select 'anon has no rights on: ' || t.name,
         not exists (select 1 from information_schema.role_table_grants g
                     where g.table_schema = 'public' and g.table_name = t.name and g.grantee = 'anon'),
         coalesce((select string_agg(privilege_type, ', ') from information_schema.role_table_grants g
                   where g.table_schema = 'public' and g.table_name = t.name and g.grantee = 'anon'), 'none')
  from tables t

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
)
select case when ok then 'PASS' else 'FAIL' end as result, check_name, detail
from checks
order by ok, check_name;
-- FAIL rows are listed first.
