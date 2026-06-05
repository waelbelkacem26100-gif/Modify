-- Migration 013: track Shopify offline-token expiry (expiring tokens)

alter table stores add column if not exists token_expires_at timestamptz;

notify pgrst, 'reload schema';
