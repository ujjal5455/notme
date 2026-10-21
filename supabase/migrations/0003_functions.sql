-- =====================================================================
-- Flod migration 0003: the ONLY ways to change data
-- Run after 0002. Safe to re-run (CREATE OR REPLACE).
--
-- Why functions instead of letting the browser INSERT/UPDATE directly?
-- A direct UPDATE policy would let a family member change ANY column of
-- a row they can update (amount, recipient, status back to pending...).
-- Each function below does one narrow job, checks who is calling, and
-- touches only the columns that job needs.
--
-- Security notes that apply to every function:
-- * SECURITY DEFINER: runs with the table owner's rights, so it can write
--   even though users have no write grants. That is powerful, so:
-- * Every function starts by reading auth.uid() (the caller's id from
--   their login token) and checks the caller's role/ownership itself.
-- * SET search_path = '': stops anyone tricking the function into using
--   a look-alike table or function from another schema. Every name is
--   therefore fully qualified (public.profiles, auth.uid(), ...).
-- * EXECUTE is revoked from anon/public and granted only to
--   authenticated (see the bottom of this file).
-- =====================================================================

-- ---------------------------------------------------------------------
-- create_my_profile: called once after sign-up to choose a role.
-- The id is ALWAYS the caller's own id; the role can never be changed
-- later because there is no update function or policy.
-- ---------------------------------------------------------------------
create or replace function public.create_my_profile(p_role text, p_display_name text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_name    text := btrim(coalesce(p_display_name, ''));
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'You need to sign in first.';
  end if;
  if p_role is null or p_role not in ('elder', 'family') then
    raise exception 'Choose either the elder or the family member role.';
  end if;
  if char_length(v_name) not between 1 and 40 then
    raise exception 'Display name must be 1 to 40 characters.';
  end if;

  insert into public.profiles (id, role, display_name)
  values (v_uid, p_role, v_name)
  returning * into v_profile;

  return v_profile;
exception
  when unique_violation then
    raise exception 'This account already has a profile. Its role cannot be changed.';
end;
$$;

-- ---------------------------------------------------------------------
-- create_pairing_code: an ELDER (not yet linked) gets a fresh 8-character
-- code that works once, for 10 minutes. Older unused codes are deleted,
-- so only the newest code shown on screen can work.
-- ---------------------------------------------------------------------
create or replace function public.create_pairing_code()
returns public.pairing_codes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_role     text;
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 chars, no I/O/0/1
  v_bytes    bytea;
  v_code     text;
  v_row      public.pairing_codes;
begin
  if v_uid is null then
    raise exception 'You need to sign in first.';
  end if;
  select role into v_role from public.profiles where id = v_uid;
  if v_role is distinct from 'elder' then
    raise exception 'Only an elder account can create a pairing code.';
  end if;
  if exists (select 1 from public.family_links where elder_id = v_uid) then
    raise exception 'You are already linked to a family member.';
  end if;

  delete from public.pairing_codes where elder_id = v_uid and used_at is null;

  -- Try a few times in the (astronomically unlikely) case of a duplicate code.
  for attempt in 1..5 loop
    -- 8 cryptographically random bytes; 256 is a multiple of 32, so
    -- "byte % 32" picks each character with equal probability.
    v_bytes := extensions.gen_random_bytes(8);
    v_code := '';
    for i in 0..7 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % 32) + 1, 1);
    end loop;

    begin
      insert into public.pairing_codes (code, elder_id, expires_at)
      values (v_code, v_uid, now() + interval '10 minutes')
      returning * into v_row;
      return v_row;
    exception
      when unique_violation then
        null; -- try another code
    end;
  end loop;

  raise exception 'Could not create a pairing code. Please try again.';
end;
$$;

-- ---------------------------------------------------------------------
-- redeem_pairing_code: a FAMILY member types the code they were shown
-- in person. One transaction checks everything, creates the link and
-- marks the code used. FOR UPDATE locks the code row so two people
-- cannot redeem the same code at the same moment.
-- Accepts "k7qm-3xpr", "K7QM3XPR", etc.
-- ---------------------------------------------------------------------
create or replace function public.redeem_pairing_code(p_code text)
returns public.family_links
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_role text;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  v_pc   public.pairing_codes;
  v_link public.family_links;
begin
  if v_uid is null then
    raise exception 'You need to sign in first.';
  end if;
  select role into v_role from public.profiles where id = v_uid;
  if v_role is distinct from 'family' then
    raise exception 'Only a family member account can enter a pairing code.';
  end if;

  select * into v_pc from public.pairing_codes where code = v_code for update;
  if not found then
    raise exception 'That code is not valid. Check it and try again.';
  end if;
  if v_pc.used_at is not null then
    raise exception 'That code has already been used. Ask for a new one.';
  end if;
  if v_pc.expires_at <= now() then
    raise exception 'That code has expired. Ask for a new one.';
  end if;

  begin
    insert into public.family_links (elder_id, family_id)
    values (v_pc.elder_id, v_uid)
    returning * into v_link;
  exception
    when unique_violation then
      raise exception 'This elder is already linked to a family member.';
  end;

  update public.pairing_codes
  set used_at = now(), used_by = v_uid
  where code = v_code;

  return v_link;
end;
$$;

-- ---------------------------------------------------------------------
-- create_money_request: an ELDER asks their linked family member to
-- confirm an exact amount + recipient.
-- The server decides: who receives it (from family_links), the status
-- (pending), and all timestamps (database clock). The browser only
-- supplies amount, recipient, note and a requested timeout, which is
-- clamped to 15–600 seconds.
-- ---------------------------------------------------------------------
create or replace function public.create_money_request(
  p_amount_inr      integer,
  p_recipient       text,
  p_note            text default null,
  p_timeout_seconds integer default 60
)
returns public.money_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_role      text;
  v_family_id uuid;
  v_recipient text := btrim(coalesce(p_recipient, ''));
  v_note      text := nullif(btrim(coalesce(p_note, '')), '');
  v_timeout   integer := greatest(15, least(600, coalesce(p_timeout_seconds, 60)));
  v_row       public.money_requests;
begin
  if v_uid is null then
    raise exception 'You need to sign in first.';
  end if;
  select role into v_role from public.profiles where id = v_uid;
  if v_role is distinct from 'elder' then
    raise exception 'Only an elder account can create a request.';
  end if;

  select family_id into v_family_id from public.family_links where elder_id = v_uid;
  if v_family_id is null then
    raise exception 'Link a family member before sending a request.';
  end if;

  -- Same limits as src/lib/validation.ts, enforced where they cannot be bypassed.
  if p_amount_inr is null or p_amount_inr not between 1 and 100000 then
    raise exception 'Amount must be a whole number of rupees from 1 to 100000.';
  end if;
  if char_length(v_recipient) not between 3 and 100 then
    raise exception 'Recipient must be 3 to 100 characters.';
  end if;
  if v_note is not null and char_length(v_note) > 200 then
    raise exception 'Note must be at most 200 characters.';
  end if;

  insert into public.money_requests
    (elder_id, family_id, amount_inr, recipient, note, status, created_at, expires_at)
  values
    (v_uid, v_family_id, p_amount_inr, v_recipient, v_note, 'pending',
     now(), now() + make_interval(secs => v_timeout))
  returning * into v_row;

  return v_row;
end;
$$;

-- ---------------------------------------------------------------------
-- respond_to_request: the ASSIGNED family member approves or rejects.
-- One conditional UPDATE does all the safety work at once:
--   right request AND sent to me AND still pending AND not expired.
-- If two answers race, Postgres locks the row; the second one re-checks
-- "status = 'pending'", finds it false, and changes nothing.
-- Only status and responded_at can change; amount/recipient cannot.
-- ---------------------------------------------------------------------
create or replace function public.respond_to_request(p_request_id uuid, p_decision text)
returns public.money_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_row      public.money_requests;
  v_existing public.money_requests;
begin
  if v_uid is null then
    raise exception 'You need to sign in first.';
  end if;
  if p_decision is null or p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected.';
  end if;

  update public.money_requests
  set status = p_decision, responded_at = now()
  where id = p_request_id
    and family_id = v_uid
    and status = 'pending'
    and expires_at > now()
  returning * into v_row;

  if found then
    return v_row;
  end if;

  -- Nothing changed: explain why, without revealing other people's requests.
  select * into v_existing from public.money_requests where id = p_request_id;
  if not found or v_existing.family_id <> v_uid then
    raise exception 'Request not found.';
  elsif v_existing.status <> 'pending' then
    raise exception 'This request has already been answered.';
  else
    raise exception 'This request has expired, so it can no longer be answered.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Who may call these functions: signed-in users only.
-- (Supabase grants EXECUTE to anon by default, so revoke it explicitly.)
-- ---------------------------------------------------------------------
revoke execute on function public.create_my_profile(text, text) from public, anon;
revoke execute on function public.create_pairing_code() from public, anon;
revoke execute on function public.redeem_pairing_code(text) from public, anon;
revoke execute on function public.create_money_request(integer, text, text, integer) from public, anon;
revoke execute on function public.respond_to_request(uuid, text) from public, anon;

grant execute on function public.create_my_profile(text, text) to authenticated;
grant execute on function public.create_pairing_code() to authenticated;
grant execute on function public.redeem_pairing_code(text) to authenticated;
grant execute on function public.create_money_request(integer, text, text, integer) to authenticated;
grant execute on function public.respond_to_request(uuid, text) to authenticated;
