-- Permissions complètes pour les content_blocks
alter table if exists public.content_blocks enable row level security;

drop policy if exists content_blocks_admin_select on public.content_blocks;
create policy content_blocks_admin_select
  on public.content_blocks
  for select
  to authenticated
  using (public.is_admin_or_owner(auth.uid()));

drop policy if exists content_blocks_admin_insert on public.content_blocks;
create policy content_blocks_admin_insert
  on public.content_blocks
  for insert
  to authenticated
  with check (public.is_admin_or_owner(auth.uid()));

drop policy if exists content_blocks_admin_update on public.content_blocks;
create policy content_blocks_admin_update
  on public.content_blocks
  for update
  to authenticated
  using (public.is_admin_or_owner(auth.uid()))
  with check (public.is_admin_or_owner(auth.uid()));

drop policy if exists content_blocks_admin_delete on public.content_blocks;
create policy content_blocks_admin_delete
  on public.content_blocks
  for delete
  to authenticated
  using (public.is_admin_or_owner(auth.uid()));

grant select, insert, update, delete on public.content_blocks to authenticated;
