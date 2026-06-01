-- Migration 001: add original_file_content to fixes for reliable rollback
alter table fixes add column if not exists original_file_content text;
