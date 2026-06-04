-- ============================================================================
-- MODIFY — Consolidated pending migrations 003 → 012
-- ============================================================================
-- Run this ONCE in the Supabase SQL Editor. Fully idempotent and re-runnable:
-- every CREATE POLICY is guarded by DROP POLICY IF EXISTS, every table/column/
-- index uses IF [NOT] EXISTS, and the only data UPDATE is WHERE-guarded.
-- Wrapped in a transaction so it applies all-or-nothing.
-- ============================================================================

begin;

create extension if not exists "uuid-ossp";

-- ─── 003 — backup system, risk groups, audit logs ──────────────────────────
alter table stores add column if not exists backup_theme_id text;
alter table stores add column if not exists backup_created_at timestamptz;

alter table fixes add column if not exists risk_group text default 'b';
alter table fixes add column if not exists verification_status text default 'pending';
alter table fixes add column if not exists preview_theme_id text;

alter table fixes drop constraint if exists fixes_status_check;
alter table fixes add constraint fixes_status_check
  check (status in ('pending', 'applied', 'rolled_back', 'failed', 'preview'));

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

drop policy if exists "Users can view own audit logs" on audit_logs;
create policy "Users can view own audit logs"
  on audit_logs for select
  using (store_id in (select id from stores where user_id = auth.uid()::text));

create index if not exists idx_audit_logs_store_id on audit_logs (store_id);
create index if not exists idx_audit_logs_fix_id on audit_logs (fix_id);
create index if not exists idx_audit_logs_created_at on audit_logs (created_at desc);

-- ─── 006 — repair audit_logs missing columns (the `create table if not exists`
--           in 003 was a no-op because the table pre-existed) ────────────────
alter table audit_logs add column if not exists action text;
alter table audit_logs add column if not exists fix_id uuid references fixes(id) on delete set null;
update audit_logs set action = 'legacy' where action is null;
alter table audit_logs alter column action set not null;
create index if not exists idx_audit_logs_fix_id on audit_logs (fix_id);

-- ─── 005 — audit_logs INSERT policy ─────────────────────────────────────────
drop policy if exists "Service role insert audit logs" on audit_logs;
create policy "Service role insert audit logs"
  on audit_logs for insert
  with check (true);

-- ─── 004 — fix mis-classified product-description fixes (data, WHERE-guarded) ─
update fixes
set risk_group = 'a', liquid_before = null, liquid_after = null, file_path = null, theme_id = null
where (title ilike '%description%' or type = 'product') and risk_group != 'a';

-- ─── 007 — image optimizations ──────────────────────────────────────────────
create table if not exists image_optimizations (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id) on delete cascade,
  product_id bigint not null,
  old_image_id bigint,
  new_image_id bigint,
  old_src text,
  original_bytes integer not null default 0,
  new_bytes integer not null default 0,
  saved_bytes integer not null default 0,
  created_at timestamptz default now() not null
);
alter table image_optimizations enable row level security;

drop policy if exists "Users can view own image optimizations" on image_optimizations;
create policy "Users can view own image optimizations"
  on image_optimizations for select
  using (store_id in (select id from stores where user_id = auth.uid()::text));

drop policy if exists "Service role insert image optimizations" on image_optimizations;
create policy "Service role insert image optimizations"
  on image_optimizations for insert
  with check (true);

create index if not exists idx_image_opt_store on image_optimizations (store_id, created_at desc);

-- ─── 008 — pagespeed scores ─────────────────────────────────────────────────
create table if not exists pagespeed_scores (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id) on delete cascade,
  audit_id uuid references audits(id) on delete set null,
  strategy text not null default 'mobile' check (strategy in ('mobile', 'desktop')),
  tested_url text,
  score integer not null default 0,
  lcp_ms integer not null default 0,
  cls numeric(6, 3) not null default 0,
  tbt_ms integer not null default 0,
  fcp_ms integer not null default 0,
  speed_index_ms integer not null default 0,
  tti_ms integer not null default 0,
  opportunities jsonb,
  created_at timestamptz default now() not null
);
alter table pagespeed_scores enable row level security;

drop policy if exists "Users can view own pagespeed scores" on pagespeed_scores;
create policy "Users can view own pagespeed scores"
  on pagespeed_scores for select
  using (store_id in (select id from stores where user_id = auth.uid()::text));

drop policy if exists "Service role insert pagespeed scores" on pagespeed_scores;
create policy "Service role insert pagespeed scores"
  on pagespeed_scores for insert
  with check (true);

create index if not exists idx_pagespeed_store on pagespeed_scores (store_id, created_at desc);

-- ─── 009 — blog articles ────────────────────────────────────────────────────
create table if not exists blog_articles (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id) on delete cascade,
  blog_id bigint,
  article_id bigint,
  title text not null,
  handle text,
  url text,
  tags text,
  created_at timestamptz default now() not null
);
alter table blog_articles enable row level security;

drop policy if exists "Users can view own blog articles" on blog_articles;
create policy "Users can view own blog articles"
  on blog_articles for select
  using (store_id in (select id from stores where user_id = auth.uid()::text));

drop policy if exists "Service role insert blog articles" on blog_articles;
create policy "Service role insert blog articles"
  on blog_articles for insert
  with check (true);

create index if not exists idx_blog_articles_store on blog_articles (store_id, created_at desc);

-- ─── 010 — global score snapshots ───────────────────────────────────────────
create table if not exists store_score_snapshots (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id) on delete cascade,
  score integer not null default 0,
  recovered_euros numeric(12, 2) not null default 0,
  potential_euros numeric(12, 2) not null default 0,
  components jsonb,
  created_at timestamptz default now() not null
);
alter table store_score_snapshots enable row level security;

drop policy if exists "Users can view own score snapshots" on store_score_snapshots;
create policy "Users can view own score snapshots"
  on store_score_snapshots for select
  using (store_id in (select id from stores where user_id = auth.uid()::text));

drop policy if exists "Service role insert score snapshots" on store_score_snapshots;
create policy "Service role insert score snapshots"
  on store_score_snapshots for insert
  with check (true);

create index if not exists idx_score_snapshots_store on store_score_snapshots (store_id, created_at desc);

-- ─── 011 — reversible product promos ────────────────────────────────────────
create table if not exists product_promos (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id) on delete cascade,
  product_id bigint not null,
  variant_id bigint not null,
  original_price numeric(12, 2) not null,
  original_compare_at numeric(12, 2),
  new_price numeric(12, 2) not null,
  new_compare_at numeric(12, 2),
  status text not null default 'active' check (status in ('active', 'reverted')),
  created_at timestamptz default now() not null,
  reverted_at timestamptz
);
alter table product_promos enable row level security;

drop policy if exists "Users can view own promos" on product_promos;
create policy "Users can view own promos"
  on product_promos for select
  using (store_id in (select id from stores where user_id = auth.uid()::text));

drop policy if exists "Service role manage promos" on product_promos;
create policy "Service role manage promos"
  on product_promos for all
  using (true) with check (true);

create index if not exists idx_product_promos_store on product_promos (store_id, status);

-- ─── 012 — guided accompaniment tasks ───────────────────────────────────────
create table if not exists guides (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id) on delete cascade,
  type text not null check (type in ('photos', 'theme_ux', 'marketing', 'products')),
  title text not null,
  impact_euros numeric(10, 2) not null default 0,
  summary text,
  steps jsonb,
  status text not null default 'todo' check (status in ('todo', 'done')),
  created_at timestamptz default now() not null,
  completed_at timestamptz
);
alter table guides enable row level security;

drop policy if exists "Users can view own guides" on guides;
create policy "Users can view own guides"
  on guides for select
  using (store_id in (select id from stores where user_id = auth.uid()::text));

drop policy if exists "Service role manage guides" on guides;
create policy "Service role manage guides"
  on guides for all
  using (true) with check (true);

create index if not exists idx_guides_store on guides (store_id, created_at desc);

commit;

-- Reload PostgREST's schema cache so the new tables/columns are visible to the API.
notify pgrst, 'reload schema';
