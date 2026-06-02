-- Migration 003: backup system, risk groups, audit logs

-- Track session backup on stores
alter table stores add column if not exists backup_theme_id text;
alter table stores add column if not exists backup_created_at timestamptz;

-- Risk group, verification, preview support on fixes
alter table fixes add column if not exists risk_group text default 'b';
alter table fixes add column if not exists verification_status text default 'pending';
alter table fixes add column if not exists preview_theme_id text;

-- Extend status values (drop old constraint, add new one)
alter table fixes drop constraint if exists fixes_status_check;
alter table fixes add constraint fixes_status_check
  check (status in ('pending', 'applied', 'rolled_back', 'failed', 'preview'));

-- Audit logs: every action is logged
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id) on delete cascade,
  fix_id uuid references fixes(id) on delete set null,
  action text not null,
  details jsonb,
  status text not null default 'success'
    check (status in ('success', 'failed', 'warning')),
  created_at timestamptz default now() not null
);

alter table audit_logs enable row level security;

create policy "Users can view own audit logs"
  on audit_logs for select
  using (
    store_id in (select id from stores where user_id = auth.uid()::text)
  );

create index if not exists idx_audit_logs_store_id on audit_logs (store_id);
create index if not exists idx_audit_logs_fix_id on audit_logs (fix_id);
create index if not exists idx_audit_logs_created_at on audit_logs (created_at desc);
