-- =====================================================================
-- Notme security checks (run AFTER migrations 0001–0007)
--
-- HOW TO USE: paste this whole file into the Supabase SQL Editor and
-- click Run. The result table should show PASS on every row.
--
-- WHAT IT DOES:
-- * Creates 4 throwaway users with synthetic emails (@example.test):
--     Elder A, Family B (A's relative), Family C (stranger), Elder D.
-- * Pretends to be each user in turn (sets the same role + login-token
--   claims that Supabase sets for a real signed-in request) and tries
--   allowed AND forbidden actions.
-- * Deletes the test users at the end (their profiles, links and
--   requests are removed automatically by ON DELETE CASCADE).
-- * Keeps only the results in a small "notme_test" schema. Remove it
--   any time with:  drop schema notme_test cascade;
--
-- The SQL Editor may warn that this query contains DELETE/DROP
-- statements. That is expected: they only remove the test data above.
-- =====================================================================

drop schema if exists notme_test cascade;
create schema notme_test;

create table notme_test.results (
  id         serial primary key,
  check_name text not null,
  passed     boolean not null,
  detail     text
);

-- Records a result. SECURITY DEFINER so it works while we are
-- pretending to be an ordinary signed-in user.
create function notme_test.record(p_name text, p_passed boolean, p_detail text default null)
returns void language sql security definer set search_path = '' as $$
  insert into notme_test.results (check_name, passed, detail) values (p_name, p_passed, p_detail);
$$;

-- Pretend to be a signed-in user: the same role and token claims
-- that Supabase's API sets for a real request.
create function notme_test.act_as(p_user uuid)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
end;
$$;

-- Pretend to be a logged-out visitor.
create function notme_test.act_as_anon()
returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end;
$$;

grant usage on schema notme_test to authenticated, anon;
grant execute on all functions in schema notme_test to authenticated, anon;

do $checks$
declare
  v_elder_a  uuid := '00000000-0000-4000-8000-00000000000a';
  v_family_b uuid := '00000000-0000-4000-8000-00000000000b';
  v_family_c uuid := '00000000-0000-4000-8000-00000000000c';
  v_elder_d  uuid := '00000000-0000-4000-8000-00000000000d';
  v_code     text;
  v_code_d   text;
  v_req      public.money_requests;
  v_req2     public.money_requests;
  v_n        integer;
  v_status   text;
  v_secs     numeric;
begin
  -- ---------------------------------------------------------------
  -- Setup as the database owner: fresh test users.
  -- ---------------------------------------------------------------
  delete from auth.users where id in (v_elder_a, v_family_b, v_family_c, v_elder_d);
  insert into auth.users (id, email) values
    (v_elder_a,  'rls-test-elder-a@example.test'),
    (v_family_b, 'rls-test-family-b@example.test'),
    (v_family_c, 'rls-test-family-c@example.test'),
    (v_elder_d,  'rls-test-elder-d@example.test');

  -- ---------------------------------------------------------------
  -- 1. Profiles and roles
  -- ---------------------------------------------------------------
  perform notme_test.act_as(v_elder_a);
  perform public.create_my_profile('elder', 'Test Elder A');
  perform notme_test.act_as(v_family_b);
  perform public.create_my_profile('family', 'Test Family B');
  perform notme_test.act_as(v_family_c);
  perform public.create_my_profile('family', 'Test Stranger C');
  perform notme_test.act_as(v_elder_d);
  begin
    perform public.create_my_profile('admin', 'Test Elder D');
    perform notme_test.record('profile: invented role "admin" is refused', false, 'call succeeded');
  exception when others then
    perform notme_test.record('profile: invented role "admin" is refused', true, sqlerrm);
  end;
  perform public.create_my_profile('elder', 'Test Elder D');
  perform notme_test.record('profile: 4 test profiles created', true);

  perform notme_test.act_as(v_elder_a);
  begin
    perform public.create_my_profile('family', 'Switching role');
    perform notme_test.record('profile: role cannot be changed later', false, 'call succeeded');
  exception when others then
    perform notme_test.record('profile: role cannot be changed later', true, sqlerrm);
  end;

  begin
    update public.profiles set role = 'family' where id = v_elder_a;
    perform notme_test.record('profile: direct UPDATE of own role is blocked', false, 'update ran');
  exception when insufficient_privilege then
    perform notme_test.record('profile: direct UPDATE of own role is blocked', true, sqlerrm);
  end;

  -- ---------------------------------------------------------------
  -- 2. Pairing
  -- ---------------------------------------------------------------
  perform notme_test.act_as(v_family_b);
  begin
    perform public.create_pairing_code();
    perform notme_test.record('pairing: family account cannot create a code', false, 'call succeeded');
  exception when others then
    perform notme_test.record('pairing: family account cannot create a code', true, sqlerrm);
  end;

  perform notme_test.act_as(v_elder_a);
  select code into v_code from public.create_pairing_code();
  perform notme_test.record('pairing: elder A gets an 8-character code',
    v_code ~ '^[A-HJ-NP-Z2-9]{8}$', 'code format ok');

  perform notme_test.act_as(v_family_c);
  select count(*) into v_n from public.pairing_codes;
  perform notme_test.record('pairing: stranger C cannot see any pairing codes', v_n = 0, v_n || ' visible');

  perform notme_test.act_as(v_family_b);
  begin
    perform public.redeem_pairing_code('ZZZZZZZZ');
    perform notme_test.record('pairing: a made-up code is refused', false, 'call succeeded');
  exception when others then
    perform notme_test.record('pairing: a made-up code is refused', true, sqlerrm);
  end;

  -- Lower-case with a dash, as a person might type it.
  perform public.redeem_pairing_code(lower(substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4)));
  select count(*) into v_n from public.family_links where elder_id = v_elder_a and family_id = v_family_b;
  perform notme_test.record('pairing: family B links to elder A with the code', v_n = 1, v_n || ' link(s)');

  perform notme_test.act_as(v_family_c);
  begin
    perform public.redeem_pairing_code(v_code);
    perform notme_test.record('pairing: a used code cannot be used again', false, 'call succeeded');
  exception when others then
    perform notme_test.record('pairing: a used code cannot be used again', true, sqlerrm);
  end;

  perform notme_test.act_as(v_elder_a);
  begin
    perform public.create_pairing_code();
    perform notme_test.record('pairing: linked elder cannot start a second link', false, 'call succeeded');
  exception when others then
    perform notme_test.record('pairing: linked elder cannot start a second link', true, sqlerrm);
  end;

  -- Expired code: elder D makes a code, then (as owner) we age it.
  perform notme_test.act_as(v_elder_d);
  select code into v_code_d from public.create_pairing_code();
  reset role;
  update public.pairing_codes
    set created_at = now() - interval '20 minutes', expires_at = now() - interval '10 minutes'
    where code = v_code_d;
  perform notme_test.act_as(v_family_c);
  begin
    perform public.redeem_pairing_code(v_code_d);
    perform notme_test.record('pairing: an expired code is refused', false, 'call succeeded');
  exception when others then
    perform notme_test.record('pairing: an expired code is refused', true, sqlerrm);
  end;

  -- ---------------------------------------------------------------
  -- 3. Who can see whose profile
  -- ---------------------------------------------------------------
  perform notme_test.act_as(v_family_b);
  select count(*) into v_n from public.profiles where id = v_elder_a;
  perform notme_test.record('profiles: linked family B can see elder A''s name', v_n = 1, v_n || ' visible');

  perform notme_test.act_as(v_family_c);
  select count(*) into v_n from public.profiles where id <> v_family_c;
  perform notme_test.record('profiles: stranger C sees no one else''s profile', v_n = 0, v_n || ' visible');

  -- ---------------------------------------------------------------
  -- 4. Creating requests
  -- ---------------------------------------------------------------
  perform notme_test.act_as(v_elder_a);
  select * into v_req from public.create_money_request(2500, 60);
  v_secs := extract(epoch from (v_req.expires_at - v_req.created_at));
  perform notme_test.record('requests: elder A creates a pending request for family B',
    v_req.status = 'pending' and v_req.family_id = v_family_b and v_req.amount_inr = 2500
      and v_secs = 60,
    format('status=%s, deadline in %s s', v_req.status, v_secs));

  -- 0006: the old version that also took a recipient and a note must be gone.
  begin
    perform public.create_money_request(2500, 'test.shop@demo-upi'::text, null::text, 60);
    perform notme_test.record('requests: old recipient/note version is gone', false, 'call succeeded');
  exception when undefined_function then
    perform notme_test.record('requests: old recipient/note version is gone', true, sqlerrm);
  end;

  begin
    perform public.create_money_request(0);
    perform notme_test.record('requests: amount 0 is refused', false, 'call succeeded');
  exception when others then
    perform notme_test.record('requests: amount 0 is refused', true, sqlerrm);
  end;

  begin
    perform public.create_money_request(100001);
    perform notme_test.record('requests: amount above 1,00,000 is refused', false, 'call succeeded');
  exception when others then
    perform notme_test.record('requests: amount above 1,00,000 is refused', true, sqlerrm);
  end;

  select * into v_req2 from public.create_money_request(10, 5);
  v_secs := extract(epoch from (v_req2.expires_at - v_req2.created_at));
  perform notme_test.record('requests: a too-short timeout is raised to 15 s', v_secs = 15, v_secs || ' s');

  begin
    insert into public.money_requests (elder_id, family_id, amount_inr, expires_at)
    values (v_elder_a, v_family_c, 5, now() + interval '1 hour');
    perform notme_test.record('requests: direct INSERT (choosing the receiver) is blocked', false, 'insert ran');
  exception when insufficient_privilege then
    perform notme_test.record('requests: direct INSERT (choosing the receiver) is blocked', true, sqlerrm);
  end;

  perform notme_test.act_as(v_elder_d);
  begin
    perform public.create_money_request(500);
    perform notme_test.record('requests: unlinked elder D cannot create a request', false, 'call succeeded');
  exception when others then
    perform notme_test.record('requests: unlinked elder D cannot create a request', true, sqlerrm);
  end;

  perform notme_test.act_as(v_family_b);
  begin
    perform public.create_money_request(500);
    perform notme_test.record('requests: family account cannot create a request', false, 'call succeeded');
  exception when others then
    perform notme_test.record('requests: family account cannot create a request', true, sqlerrm);
  end;

  -- ---------------------------------------------------------------
  -- 5. Who can see requests
  -- ---------------------------------------------------------------
  perform notme_test.act_as(v_elder_a);
  select count(*) into v_n from public.money_requests;
  perform notme_test.record('visibility: elder A sees own 2 requests', v_n = 2, v_n || ' visible');

  perform notme_test.act_as(v_family_b);
  select count(*) into v_n from public.money_requests;
  perform notme_test.record('visibility: assigned family B sees the 2 requests', v_n = 2, v_n || ' visible');

  perform notme_test.act_as(v_family_c);
  select count(*) into v_n from public.money_requests;
  perform notme_test.record('visibility: stranger C sees 0 requests', v_n = 0, v_n || ' visible');

  perform notme_test.act_as(v_elder_d);
  select count(*) into v_n from public.money_requests;
  perform notme_test.record('visibility: another elder D sees 0 requests', v_n = 0, v_n || ' visible');

  perform notme_test.act_as_anon();
  begin
    select count(*) into v_n from public.money_requests;
    perform notme_test.record('visibility: logged-out visitor cannot read requests', false, v_n || ' rows readable');
  exception when insufficient_privilege then
    perform notme_test.record('visibility: logged-out visitor cannot read requests', true, sqlerrm);
  end;

  begin
    perform public.create_money_request(500);
    perform notme_test.record('functions: logged-out visitor cannot call them', false, 'call succeeded');
  exception when insufficient_privilege then
    perform notme_test.record('functions: logged-out visitor cannot call them', true, sqlerrm);
  end;

  -- ---------------------------------------------------------------
  -- 6. Approving / rejecting
  -- ---------------------------------------------------------------
  perform notme_test.act_as(v_family_c);
  begin
    perform public.respond_to_request(v_req.id, 'approved');
    perform notme_test.record('respond: stranger C cannot approve', false, 'call succeeded');
  exception when others then
    perform notme_test.record('respond: stranger C cannot approve', true, sqlerrm);
  end;

  perform notme_test.act_as(v_elder_a);
  begin
    perform public.respond_to_request(v_req.id, 'approved');
    perform notme_test.record('respond: elder A cannot approve own request', false, 'call succeeded');
  exception when others then
    perform notme_test.record('respond: elder A cannot approve own request', true, sqlerrm);
  end;

  perform notme_test.act_as(v_family_b);
  begin
    update public.money_requests set status = 'approved', responded_at = now() where id = v_req.id;
    perform notme_test.record('respond: direct UPDATE by family B is blocked', false, 'update ran');
  exception when insufficient_privilege then
    perform notme_test.record('respond: direct UPDATE by family B is blocked', true, sqlerrm);
  end;

  begin
    perform public.respond_to_request(v_req.id, 'pending');
    perform notme_test.record('respond: decision must be approved or rejected', false, 'call succeeded');
  exception when others then
    perform notme_test.record('respond: decision must be approved or rejected', true, sqlerrm);
  end;

  begin
    select status into v_status from public.respond_to_request(v_req.id, 'approved');
    perform notme_test.record('respond: family B approves the request', v_status = 'approved', v_status);
  exception when others then
    perform notme_test.record('respond: family B approves the request', false, sqlerrm);
  end;

  begin
    perform public.respond_to_request(v_req.id, 'rejected');
    perform notme_test.record('respond: a second answer is refused', false, 'call succeeded');
  exception when others then
    perform notme_test.record('respond: a second answer is refused', true, sqlerrm);
  end;

  reset role;
  select status into v_status from public.money_requests where id = v_req.id;
  perform notme_test.record('respond: request is still approved after the refused answer',
    v_status = 'approved', v_status);

  -- Late answer: age the second request past its deadline.
  update public.money_requests
    set created_at = now() - interval '10 minutes', expires_at = now() - interval '9 minutes'
    where id = v_req2.id;
  perform notme_test.act_as(v_family_b);
  begin
    perform public.respond_to_request(v_req2.id, 'approved');
    perform notme_test.record('respond: an answer after the deadline is refused', false, 'call succeeded');
  exception when others then
    perform notme_test.record('respond: an answer after the deadline is refused', true, sqlerrm);
  end;

  reset role;
  select status into v_status from public.money_requests where id = v_req2.id;
  perform notme_test.record('respond: expired request stays pending (shown as expired)',
    v_status = 'pending', v_status);

  -- ---------------------------------------------------------------
  -- 7. Push-notification device tokens (0007, onsite)
  -- ---------------------------------------------------------------
  perform notme_test.act_as(v_family_b);
  begin
    perform public.register_push_token('test-token-for-family-b-0001');
    perform notme_test.record('push: family B saves its device token', true);
  exception when others then
    perform notme_test.record('push: family B saves its device token', false, sqlerrm);
  end;

  begin
    select count(*) into v_n from public.push_tokens;
    perform notme_test.record('push: family B cannot read the token table', false, v_n || ' rows readable');
  exception when insufficient_privilege then
    perform notme_test.record('push: family B cannot read the token table', true, sqlerrm);
  end;

  begin
    insert into public.push_tokens (token, user_id) values ('sneaky-token-for-someone-0001', v_family_b);
    perform notme_test.record('push: direct INSERT is blocked', false, 'insert ran');
  exception when insufficient_privilege then
    perform notme_test.record('push: direct INSERT is blocked', true, sqlerrm);
  end;

  begin
    perform public.register_push_token('short');
    perform notme_test.record('push: a malformed token is refused', false, 'call succeeded');
  exception when others then
    perform notme_test.record('push: a malformed token is refused', true, sqlerrm);
  end;

  perform notme_test.act_as(v_elder_a);
  begin
    perform public.register_push_token('test-token-for-elder-a-00001');
    perform notme_test.record('push: an elder account cannot save a token', false, 'call succeeded');
  exception when others then
    perform notme_test.record('push: an elder account cannot save a token', true, sqlerrm);
  end;

  perform notme_test.act_as(v_family_c);
  perform public.unregister_push_token('test-token-for-family-b-0001');
  reset role;
  select count(*) into v_n from public.push_tokens
    where token = 'test-token-for-family-b-0001' and user_id = v_family_b;
  perform notme_test.record('push: stranger C cannot delete family B''s token', v_n = 1, v_n || ' row(s) left');

  perform notme_test.act_as_anon();
  begin
    perform public.register_push_token('test-token-for-anon-0000001');
    perform notme_test.record('push: logged-out visitor cannot save a token', false, 'call succeeded');
  exception when insufficient_privilege then
    perform notme_test.record('push: logged-out visitor cannot save a token', true, sqlerrm);
  end;

  perform notme_test.act_as(v_family_b);
  perform public.unregister_push_token('test-token-for-family-b-0001');
  reset role;
  select count(*) into v_n from public.push_tokens where token = 'test-token-for-family-b-0001';
  perform notme_test.record('push: family B removes its own token (sign-out)', v_n = 0, v_n || ' row(s) left');

  -- ---------------------------------------------------------------
  -- Cleanup (as owner): remove test users; CASCADE removes their data.
  -- ---------------------------------------------------------------
  delete from auth.users where id in (v_elder_a, v_family_b, v_family_c, v_elder_d);
end
$checks$;

revoke usage on schema notme_test from authenticated, anon;

select
  id,
  check_name,
  case when passed then 'PASS' else 'FAIL' end as result,
  detail
from notme_test.results
order by id;
