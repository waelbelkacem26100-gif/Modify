-- Fix existing product description entries that were incorrectly classified as
-- Group B/C (Liquid patches) instead of Group A (Products API).
-- Safe to re-run: WHERE clause excludes already-correct rows.

UPDATE fixes
SET
  risk_group    = 'a',
  liquid_before = null,
  liquid_after  = null,
  file_path     = null,
  theme_id      = null
WHERE
  (title ILIKE '%description%' OR type = 'product')
  AND risk_group != 'a';
