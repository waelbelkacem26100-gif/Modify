-- Migration 019: Pilote automatique v10 — tables du moteur d'automatisation.
-- Additive et idempotente (create table if not exists) : aucune donnée existante touchée.
-- Note : seo_articles n'est PAS recréée (la table blog_articles de la migration 009
-- couvre déjà la génération de contenu).

-- Journal des événements webhooks reçus de Shopify (produits, thème, commandes).
create table if not exists webhook_events (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id) on delete cascade,
  event_type text not null,                 -- products/create, products/update, themes/publish, orders/paid
  shopify_id text,                          -- id de la ressource Shopify concernée
  payload jsonb,
  processed_at timestamptz,                 -- null tant que non traité
  result jsonb,                             -- résultat du traitement (ce qui a été optimisé)
  created_at timestamptz default now() not null
);
create index if not exists idx_webhook_events_store
  on webhook_events (store_id, created_at desc);
create index if not exists idx_webhook_events_type
  on webhook_events (event_type, processed_at);
alter table webhook_events enable row level security;

-- Performance par produit (vues / commandes / taux de conversion) — apprentissage.
create table if not exists product_performance (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  product_id text not null,
  views_count integer default 0,
  orders_count integer default 0,
  conversion_rate numeric(5,4),
  revenue_total numeric(10,2) default 0,
  last_updated timestamptz default now() not null,
  unique (store_id, product_id)
);
create index if not exists idx_product_performance_store
  on product_performance (store_id, conversion_rate desc);
alter table product_performance enable row level security;

-- Alertes de veille concurrentielle.
create table if not exists competitor_alerts (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  competitor_url text not null,
  alert_type text not null,                 -- price_change, new_product, shipping_change
  severity text not null default 'info'
    check (severity in ('urgent', 'important', 'info')),  -- 🔴 / 🟠 / 🟡
  old_value text,
  new_value text,
  impact_assessment text,
  actioned_at timestamptz,
  created_at timestamptz default now() not null
);
create index if not exists idx_competitor_alerts_store
  on competitor_alerts (store_id, created_at desc);
alter table competitor_alerts enable row level security;

-- Prédictions de tendances.
create table if not exists trend_predictions (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid not null references stores(id) on delete cascade,
  keyword text not null,
  current_volume integer,
  predicted_volume integer,
  prediction_date date,
  confidence_score numeric(3,2),
  recommended_action text,
  created_at timestamptz default now() not null
);
create index if not exists idx_trend_predictions_store
  on trend_predictions (store_id, created_at desc);
alter table trend_predictions enable row level security;
