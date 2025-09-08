-- Ensure required extension for gen_random_uuid
create extension if not exists pgcrypto;

-- Create table if it does not exist
create table if not exists public.formation_module_statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  submission_id uuid not null,
  module_uuid uuid not null,
  status text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure required columns exist (idempotent)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='formation_module_statuses') then
    -- Add missing columns to align schema if table pre-existed with a different shape
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='formation_module_statuses' and column_name='submission_id'
    ) then
      alter table public.formation_module_statuses add column submission_id uuid;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='formation_module_statuses' and column_name='module_uuid'
    ) then
      alter table public.formation_module_statuses add column module_uuid uuid;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='formation_module_statuses' and column_name='user_id'
    ) then
      alter table public.formation_module_statuses add column user_id uuid;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='formation_module_statuses' and column_name='status'
    ) then
      alter table public.formation_module_statuses add column status text;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='formation_module_statuses' and column_name='position'
    ) then
      alter table public.formation_module_statuses add column position integer default 0;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='formation_module_statuses' and column_name='created_at'
    ) then
      alter table public.formation_module_statuses add column created_at timestamptz default now();
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='formation_module_statuses' and column_name='updated_at'
    ) then
      alter table public.formation_module_statuses add column updated_at timestamptz default now();
    end if;
  end if;
end$$;

-- Enforce allowed values for status (idempotent)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='formation_module_statuses') then
    if not exists (
      select 1
      from information_schema.constraint_column_usage ccu
      join information_schema.table_constraints tc
        on tc.constraint_name = ccu.constraint_name
      where tc.table_schema = 'public'
        and tc.table_name = 'formation_module_statuses'
        and tc.constraint_type = 'CHECK'
        and tc.constraint_name = 'formation_module_statuses_status_check'
    ) then
      alter table public.formation_module_statuses
        add constraint formation_module_statuses_status_check
        check (status in ('todo','in_progress','blocked','done'));
    end if;
  end if;
end$$;

-- Unique and helper indexes (idempotent)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='formation_module_statuses') then
    -- idx_fms_submission_module
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='formation_module_statuses' and column_name='submission_id'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='formation_module_statuses' and column_name='module_uuid'
    ) then
      create unique index if not exists idx_fms_submission_module
        on public.formation_module_statuses (submission_id, module_uuid);
    end if;

    -- idx_fms_user_submission
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='formation_module_statuses' and column_name='user_id'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='formation_module_statuses' and column_name='submission_id'
    ) then
      create index if not exists idx_fms_user_submission
        on public.formation_module_statuses (user_id, submission_id);
    end if;

    -- idx_fms_submission_position
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='formation_module_statuses' and column_name='submission_id'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='formation_module_statuses' and column_name='position'
    ) then
      create index if not exists idx_fms_submission_position
        on public.formation_module_statuses (submission_id, position);
    end if;
  end if;
end$$;

-- Trigger function to keep updated_at fresh (idempotent)
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- Attach trigger to table (idempotent)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='formation_module_statuses') then
    drop trigger if exists trg_fms_set_updated_at on public.formation_module_statuses;
  end if;
  
  create trigger trg_fms_set_updated_at
    before update on public.formation_module_statuses
    for each row
    execute function public.set_updated_at_timestamp();
exception
  when duplicate_object then
    null; -- trigger already exists, ignore
end$$;

-- Documentation
comment on table  public.formation_module_statuses is 'Kanban module statuses per user and submission (live).';
comment on column public.formation_module_statuses.submission_id is 'Links to the live submission record (approved).';
