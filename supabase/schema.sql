-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- STORES
-- ============================================
create table if not exists stores (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null,
  shop_domain text not null,
  access_token text not null,
  shop_name text,
  plan text,
  created_at timestamptz default now() not null,
  constraint stores_shop_domain_key unique (shop_domain)
);

alter table stores enable row level security;

create policy "Users can view own stores"
  on stores for select
  using (user_id = auth.uid()::text);

create policy "Service role bypass" on stores
  using (true)
  with check (true);

create index if not exists idx_stores_user_id on stores (user_id);

-- ============================================
-- AUDITS
-- ============================================
create table if not exists audits (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  results jsonb,
  total_impact_euros numeric(10, 2),
  created_at timestamptz default now() not null
);

alter table audits enable row level security;

create policy "Users can view own audits"
  on audits for select
  using (
    store_id in (select id from stores where user_id = auth.uid()::text)
  );

create index if not exists idx_audits_store_id on audits (store_id);

-- ============================================
-- FIXES
-- ============================================
create table if not exists fixes (
  id uuid primary key default uuid_generate_v4(),
  audit_id uuid not null references audits (id) on delete cascade,
  type text not null,
  title text not null,
  description text not null,
  impact_euros numeric(10, 2) not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'applied', 'rolled_back')),
  liquid_before text,
  liquid_after text,
  file_path text,
  theme_id text,
  backup_theme_id text,
  created_at timestamptz default now() not null
);

alter table fixes enable row level security;

create policy "Users can view own fixes"
  on fixes for select
  using (
    audit_id in (
      select a.id from audits a
      join stores s on s.id = a.store_id
      where s.user_id = auth.uid()::text
    )
  );

create index if not exists idx_fixes_audit_id on fixes (audit_id);

-- ============================================
-- CONVERSIONS
-- ============================================
create table if not exists conversions (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores (id) on delete cascade,
  date date not null,
  conversion_rate numeric(8, 6) not null default 0,
  revenue numeric(12, 2) not null default 0,
  sessions integer not null default 0,
  created_at timestamptz default now() not null,
  constraint conversions_store_date_key unique (store_id, date)
);

alter table conversions enable row level security;

create policy "Users can view own conversions"
  on conversions for select
  using (
    store_id in (select id from stores where user_id = auth.uid()::text)
  );

create index if not exists idx_conversions_store_date on conversions (store_id, date);
