-- =====================================================================
-- Notme migration 0009: table rights for the send-alert Edge Function
-- (onsite, Phase 4 bug fix). Run after 0001 → 0008. Safe to re-run.
--
-- The bug: on the live project, send-alert failed with
--   "permission denied for table money_requests"
-- The function's server-side steps use the secret (service_role) key.
-- service_role SKIPS Row Level Security, but it still needs ordinary table
-- privileges (GRANTs). Older Supabase projects granted every table to
-- service_role automatically; this new project does not, and our
-- migrations had only granted SELECT to signed-in users (0002).
--
-- Least privilege: grant exactly what send-alert does, nothing more.
-- (App users are unchanged: still SELECT only, and nothing on push_tokens.)
-- =====================================================================

-- Read the request it is alerting for (status, family_id, amount, expiry)…
grant select on public.money_requests to service_role;
-- …and change only alert_sent_at (claim it; clear it again if sending failed).
grant update (alert_sent_at) on public.money_requests to service_role;

-- The elder's display name for the alert text.
grant select on public.profiles to service_role;

-- The family member's device tokens; delete ones FCM says are dead.
grant select, delete on public.push_tokens to service_role;
