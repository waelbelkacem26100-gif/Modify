-- Migration 014: store the Shopify refresh token (expiring offline tokens)
-- Expiring offline access tokens come with a refresh_token that lets us mint a
-- new access token server-side, without any merchant interaction.

alter table stores add column if not exists refresh_token text;

notify pgrst, 'reload schema';
