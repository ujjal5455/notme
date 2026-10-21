-- =====================================================================
-- Flod migration 0001: tables and constraints
-- Run order: 0001 → 0002 → 0003. Safe to re-run (uses IF NOT EXISTS).
--
-- Data minimisation: we store only what the core flow needs.
-- No phone numbers, contacts, addresses, bank details or real UPI data.
-- Email + password live in Supabase's own auth.users table, not here.
-- =====================================================================

-- pgcrypto gives us gen_random_bytes() for unguessable pairing codes.
-- Supabase normally has it already in the "extensions" schema.
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- profiles: one row per signed-in account, created ONCE by
-- create_my_profile() (migration 0003). The role never changes.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         text not null check (role in ('elder', 'family')),
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- family_links: "this elder trusts this family member".
-- UNIQUE (elder_id) = an elder has at most ONE trusted family member,
-- so a scammer cannot add themselves after the real pairing.
-- A family member may help several elders (no unique on family_id).
-- ---------------------------------------------------------------------
create table if not exists public.family_links (
  id         uuid primary key default gen_random_uuid(),
  elder_id   uuid not null unique references public.profiles (id) on delete cascade,
  family_id  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint family_links_not_self check (elder_id <> family_id)
);

create index if not exists family_links_family_id_idx on public.family_links (family_id);

-- ---------------------------------------------------------------------
-- pairing_codes: short-lived, single-use invitation an elder shows
-- (in person) to their family member.
-- 8 characters from a 32-character alphabet without look-alikes (no I, O, 0, 1).
-- ---------------------------------------------------------------------
create table if not exists public.pairing_codes (
  code       text primary key check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  elder_id   uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz,
  -- CASCADE (not SET NULL): SET NULL would break the "used together" rule below
  -- and make it impossible to delete a family member's account.
  used_by    uuid references public.profiles (id) on delete cascade,
  constraint pairing_codes_expiry_after_creation check (expires_at > created_at),
  -- "used" means BOTH who and when are recorded, or neither.
  constraint pairing_codes_used_together check ((used_at is null) = (used_by is null))
);

create index if not exists pairing_codes_elder_id_idx on public.pairing_codes (elder_id);

-- ---------------------------------------------------------------------
-- money_requests: one "please confirm before I pay" request.
-- family_id is copied from family_links by create_money_request();
-- the browser never chooses who receives a request.
-- status stores only pending/approved/rejected. "Expired" is derived:
-- pending AND now() >= expires_at (same rule as src/lib/requestStatus.ts).
-- ---------------------------------------------------------------------
create table if not exists public.money_requests (
  id           uuid primary key default gen_random_uuid(),
  elder_id     uuid not null references public.profiles (id) on delete cascade,
  family_id    uuid not null references public.profiles (id) on delete cascade,
  amount_inr   integer not null check (amount_inr between 1 and 100000), -- whole rupees, demo cap
  recipient    text not null check (char_length(recipient) between 3 and 100),
  note         text check (note is null or char_length(note) between 1 and 200),
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  responded_at timestamptz,
  constraint money_requests_not_self check (elder_id <> family_id),
  constraint money_requests_expiry_after_creation check (expires_at > created_at),
  -- pending ⇔ no answer time; answered ⇔ answer time recorded.
  constraint money_requests_responded_matches_status
    check ((status = 'pending') = (responded_at is null))
);

-- Speeds up "my requests, newest first" for both sides.
create index if not exists money_requests_elder_idx on public.money_requests (elder_id, created_at desc);
create index if not exists money_requests_family_idx on public.money_requests (family_id, created_at desc);
