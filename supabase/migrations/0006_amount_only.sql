-- =====================================================================
-- Notme migration 0006: amount-only requests (onsite, Hackyard Build 2026)
-- Run after 0001 → 0005. Safe to re-run.
--
-- Why: in a panic the elder should type as little as possible, so Notme
-- sends only the AMOUNT. The family member's job is to call the elder on a
-- number they already trust, not to judge a UPI ID. So:
-- * money_requests loses its recipient and note columns.
-- * create_money_request now takes only the amount (plus the demo timeout).
--   The old 4-argument version (amount, recipient, note, timeout) is
--   dropped, so nothing can still send a recipient or a note.
-- Unchanged: RLS policies (0002), respond_to_request (0003),
-- Realtime (0004), server_now (0005).
-- =====================================================================

-- 1. Remove the old function first: its body still mentions the columns
--    that step 2 removes.
drop function if exists public.create_money_request(integer, text, text, integer);

-- 2. Remove the columns. Their CHECK constraints go with them.
alter table public.money_requests drop column if exists recipient;
alter table public.money_requests drop column if exists note;

-- ---------------------------------------------------------------------
-- 3. create_money_request: an ELDER sends the amount they are being asked
-- for to their linked family member.
-- The server decides: who receives it (from family_links), the status
-- (pending), and all timestamps (database clock). The browser only
-- supplies the amount and a requested timeout, clamped to 15–600 seconds.
-- Same security pattern as every function in 0003.
-- ---------------------------------------------------------------------
create or replace function public.create_money_request(
  p_amount_inr      integer,
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

  insert into public.money_requests
    (elder_id, family_id, amount_inr, status, created_at, expires_at)
  values
    (v_uid, v_family_id, p_amount_inr, 'pending',
     now(), now() + make_interval(secs => v_timeout))
  returning * into v_row;

  return v_row;
end;
$$;

-- 4. Signed-in users only (Supabase grants EXECUTE to anon by default).
revoke execute on function public.create_money_request(integer, integer) from public, anon;
grant execute on function public.create_money_request(integer, integer) to authenticated;
