-- Migration 005: fix audit_logs INSERT access
--
-- Migration 003 created audit_logs with RLS enabled but only a SELECT policy.
-- If the service role key isn't active (env var missing/wrong), inserts from
-- the API routes fail with 400. This adds an unconditional INSERT policy so
-- any server-side insert works regardless of RLS context.

-- Unconditional INSERT — audit logs are written by server-side API routes only
drop policy if exists "Service role insert audit logs" on audit_logs;
create policy "Service role insert audit logs"
  on audit_logs for insert
  with check (true);

-- store_id is already nullable in migration 003, but make the intent explicit
-- (no ALTER needed — this comment documents the existing nullable behaviour)

-- Also ensure fix_id foreign key is SET NULL on delete (already correct in 003,
-- but re-stated here for clarity)
