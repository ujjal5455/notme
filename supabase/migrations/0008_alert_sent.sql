-- =====================================================================
-- Notme migration 0008: remember that a request's alert was sent
-- (onsite, Phase 4). Run after 0001 → 0007. Safe to re-run.
--
-- The send-alert Edge Function sets alert_sent_at with a conditional
-- update ("only if it is still empty"), so each request rings the
-- family member's phone at most once, even if the elder's app retries
-- or two calls race. If every send fails, the function clears it again
-- so Retry can work.
--
-- Only the server (service-role / secret key) writes this column: app
-- users still have SELECT only (0002), so the elder's screen can show
-- "Alert sent" after a reload, but nobody can fake or reset it.
-- =====================================================================

alter table public.money_requests add column if not exists alert_sent_at timestamptz;
