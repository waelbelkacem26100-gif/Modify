-- Migration 011: reversible automatic promos (variant price + compare-at)

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

create policy "Users can view own promos"
  on product_promos for select
  using (
    store_id in (select id from stores where user_id = auth.uid()::text)
  );

drop policy if exists "Service role manage promos" on product_promos;
create policy "Service role manage promos"
  on product_promos for all
  using (true) with check (true);

create index if not exists idx_product_promos_store on product_promos (store_id, status);

notify pgrst, 'reload schema';
