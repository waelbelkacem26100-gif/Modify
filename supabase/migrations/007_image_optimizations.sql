-- Migration 007: image optimization tracking (Sharp compression + re-upload)

create table if not exists image_optimizations (
  id uuid primary key default uuid_generate_v4(),
  store_id uuid references stores(id) on delete cascade,
  product_id bigint not null,
  old_image_id bigint,
  new_image_id bigint,
  old_src text,
  original_bytes integer not null default 0,
  new_bytes integer not null default 0,
  saved_bytes integer not null default 0,
  created_at timestamptz default now() not null
);

alter table image_optimizations enable row level security;

create policy "Users can view own image optimizations"
  on image_optimizations for select
  using (
    store_id in (select id from stores where user_id = auth.uid()::text)
  );

-- Server-side inserts (service role / cron) — unconditional, like audit_logs
drop policy if exists "Service role insert image optimizations" on image_optimizations;
create policy "Service role insert image optimizations"
  on image_optimizations for insert
  with check (true);

create index if not exists idx_image_opt_store on image_optimizations (store_id, created_at desc);

notify pgrst, 'reload schema';
