-- Migration 015: per-store automation mode (auto vs weekly approval)
-- 'auto'     → Modify applies improvements automatically.
-- 'approval' → Modify emails the merchant each Monday; they approve in 1 click.
alter table stores
  add column if not exists mode text not null default 'auto'
  check (mode in ('auto', 'approval'));
