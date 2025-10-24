-- Ensure admin users can gérer les block_samples
alter table if exists public.block_samples enable row level security;

drop policy if exists block_samples_admin_insert on public.block_samples;
create policy block_samples_admin_insert
  on public.block_samples
  for insert
  to authenticated
  with check (public.is_admin_or_owner(auth.uid()));

drop policy if exists block_samples_admin_update on public.block_samples;
create policy block_samples_admin_update
  on public.block_samples
  for update
  to authenticated
  using (public.is_admin_or_owner(auth.uid()))
  with check (public.is_admin_or_owner(auth.uid()));

drop policy if exists block_samples_admin_delete on public.block_samples;
create policy block_samples_admin_delete
  on public.block_samples
  for delete
  to authenticated
  using (public.is_admin_or_owner(auth.uid()));

grant select on public.block_samples to anon;
grant select, insert, update, delete on public.block_samples to authenticated;
