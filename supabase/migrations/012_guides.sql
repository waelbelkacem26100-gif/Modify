-- Migration 012: guided accompaniment tasks (what Modify can't fully automate)

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

create policy "Users can view own guides"
  on guides for select
  using (
    store_id in (select id from stores where user_id = auth.uid()::text)
  );

drop policy if exists "Service role manage guides" on guides;
create policy "Service role manage guides"
  on guides for all
  using (true) with check (true);

create index if not exists idx_guides_store on guides (store_id, created_at desc);

notify pgrst, 'reload schema';
