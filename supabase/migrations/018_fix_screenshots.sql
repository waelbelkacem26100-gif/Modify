-- Migration 018: before/after screenshots for fixes
alter table fixes
  add column if not exists screenshot_before text,
  add column if not exists screenshot_after text;
