-- Migration 016: subscription plan tier (free / starter / pro)
alter table subscriptions
  add column if not exists plan text default 'starter'
  check (plan in ('free', 'starter', 'pro'));
