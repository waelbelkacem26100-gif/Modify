-- Migration 010: global Modify Score snapshots (week-by-week evolution in €)

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

create policy "Users can view own score snapshots"
  on store_score_snapshots for select
  using (
    store_id in (select id from stores where user_id = auth.uid()::text)
  );

drop policy if exists "Service role insert score snapshots" on store_score_snapshots;
create policy "Service role insert score snapshots"
  on store_score_snapshots for insert
  with check (true);

create index if not exists idx_score_snapshots_store on store_score_snapshots (store_id, created_at desc);

notify pgrst, 'reload schema';
