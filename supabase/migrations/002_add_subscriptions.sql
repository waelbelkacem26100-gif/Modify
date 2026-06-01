-- Migration 002: subscriptions table for Stripe billing
create table if not exists subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id text not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'trialing'
    check (status in ('active', 'trialing', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'unpaid')),
  current_period_end timestamptz,
  trial_end timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table subscriptions enable row level security;

create policy "Users can view own subscription"
  on subscriptions for select
  using (user_id = auth.uid()::text);

create index if not exists idx_subscriptions_user_id on subscriptions (user_id);
