-- Migration 017: winning-products feed (Agent Produits)
create table if not exists winning_products (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  name text not null,
  why text not null,                       -- why it's a winner (simple FR)
  recommended_price_eur numeric not null,  -- recommended selling price
  margin_pct integer,                      -- estimated margin %
  score text not null default 'good'
    check (score in ('fire', 'good', 'watch')), -- 🔥 / ⭐ / 📈
  category text,                           -- niche / category
  sources text[],                          -- e.g. ['Google','TikTok','Amazon']
  created_at timestamptz default now() not null
);

create index if not exists idx_winning_products_store
  on winning_products (store_id, created_at desc);

alter table winning_products enable row level security;
