-- =====================================================================
-- Notme migration 0007: push-notification device tokens (onsite, Phase 3)
-- Run after 0001 → 0006. Safe to re-run.
--
-- A family member's phone gets a "device token" from Firebase Cloud
-- Messaging (FCM): the address FCM uses to reach Notme on that phone.
-- The server-side alert function (Phase 4) needs it to ring the phone.
--
-- Least privilege:
-- * App users can NOT read or write this table directly (RLS on, no
--   policies, no grants). A stranger must never be able to list tokens.
-- * They can only call register_push_token / unregister_push_token,
--   which always use the caller's own id (auth.uid()).
-- * Only the Edge Function in Phase 4, running on the server with the
--   service-role key, reads tokens to send alerts.
-- =====================================================================

create table if not exists public.push_tokens (
  -- FCM tokens are long random strings (about 150–200 characters).
  token      text primary key check (char_length(token) between 20 and 4096),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;
-- Deliberately NO policies: signed-in users see zero rows even if a grant
-- were added by mistake later.

-- ---------------------------------------------------------------------
-- register_push_token: a FAMILY member's phone saves its token.
-- If the same token was saved for another account (the phone was signed
-- in as someone else and did not unregister, e.g. it was offline), it
-- moves to the caller: one phone, one account.
-- ---------------------------------------------------------------------
create or replace function public.register_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_role  text;
  v_token text := btrim(coalesce(p_token, ''));
begin
  if v_uid is null then
    raise exception 'You need to sign in first.';
  end if;
  select role into v_role from public.profiles where id = v_uid;
  if v_role is distinct from 'family' then
    raise exception 'Only a family member account receives alerts.';
  end if;
  if char_length(v_token) not between 20 and 4096 then
    raise exception 'That device token is not valid.';
  end if;

  insert into public.push_tokens (token, user_id, updated_at)
  values (v_token, v_uid, now())
  on conflict (token) do update
    set user_id = excluded.user_id, updated_at = now();
end;
$$;

-- ---------------------------------------------------------------------
-- unregister_push_token: called on sign-out, so a signed-out phone stops
-- getting alerts. Deletes ONLY the caller's own row; someone else's token
-- is silently left alone (no error, so it reveals nothing).
-- ---------------------------------------------------------------------
create or replace function public.unregister_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'You need to sign in first.';
  end if;
  delete from public.push_tokens
  where token = btrim(coalesce(p_token, '')) and user_id = v_uid;
end;
$$;

revoke execute on function public.register_push_token(text) from public, anon;
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;
