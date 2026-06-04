-- Migration 008: PageSpeed (Lighthouse) score history for week-by-week tracking

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

create policy "Users can view own pagespeed scores"
  on pagespeed_scores for select
  using (
    store_id in (select id from stores where user_id = auth.uid()::text)
  );

drop policy if exists "Service role insert pagespeed scores" on pagespeed_scores;
create policy "Service role insert pagespeed scores"
  on pagespeed_scores for insert
  with check (true);

create index if not exists idx_pagespeed_store on pagespeed_scores (store_id, created_at desc);

notify pgrst, 'reload schema';
