-- Migration 006: repair audit_logs missing columns
--
-- ROOT CAUSE (diagnosed live 2026-06): the audit_logs table pre-existed with
-- only (id, store_id, details, status, created_at). Migration 003 used
-- `create table if not exists audit_logs (...)` — because the table already
-- existed, the statement was a NO-OP and the `action` and `fix_id` columns
-- were never added. Every POST to /rest/v1/audit_logs therefore failed with
-- PGRST204 "Could not find the 'action' column", returning HTTP 400.
--
-- This migration adds the missing columns idempotently. Safe to re-run.

alter table audit_logs add column if not exists action text;
alter table audit_logs add column if not exists fix_id uuid references fixes(id) on delete set null;

-- Backfill any pre-existing rows so the NOT NULL intent holds going forward
update audit_logs set action = 'legacy' where action is null;

-- Now enforce NOT NULL on action (matches the app contract — logAction always sends it)
alter table audit_logs alter column action set not null;

-- Indexes that migration 003 expected (no-ops if already present)
create index if not exists idx_audit_logs_fix_id on audit_logs (fix_id);

-- Ensure the INSERT policy from migration 005 is present (idempotent)
drop policy if exists "Service role insert audit logs" on audit_logs;
create policy "Service role insert audit logs"
  on audit_logs for insert
  with check (true);

-- Force PostgREST to reload its schema cache so the new columns are visible
notify pgrst, 'reload schema';
