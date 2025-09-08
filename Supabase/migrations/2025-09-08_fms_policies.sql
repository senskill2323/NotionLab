-- RLS + GRANTS for public.formation_module_statuses (idempotent)

-- Ensure RLS is enabled
alter table if exists public.formation_module_statuses enable row level security;

-- Grant baseline privileges to authenticated role (RLS still applies)
do $$
begin
  -- schema usage
  grant usage on schema public to authenticated;
  -- table privileges
  grant select, insert, update on table public.formation_module_statuses to authenticated;
exception when others then
  null; -- ignore if already granted or role missing in this environment
end$$;

-- Create SELECT policy (owner can read)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='formation_module_statuses' and policyname='fms_select_own'
  ) then
    create policy fms_select_own on public.formation_module_statuses
      for select
      using (user_id = auth.uid());
  end if;
end$$;

-- Create INSERT policy (owner can insert)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='formation_module_statuses' and policyname='fms_insert_own'
  ) then
    create policy fms_insert_own on public.formation_module_statuses
      for insert
      with check (user_id = auth.uid());
  end if;
end$$;

-- Create UPDATE policy (owner can update)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='formation_module_statuses' and policyname='fms_update_own'
  ) then
    create policy fms_update_own on public.formation_module_statuses
      for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end$$;

-- (Optional) If you need admins/service to manage data, they can bypass via service_role or a dedicated role-based policy.
