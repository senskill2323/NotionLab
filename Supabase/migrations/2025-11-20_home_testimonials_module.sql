-- Homepage testimonials module
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  author_role text,
  rating integer not null default 5 check (rating between 1 and 5),
  content text not null,
  source text not null default 'manual',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists testimonials_is_public_created_at_idx
  on public.testimonials(is_public, created_at desc);

drop trigger if exists trg_testimonials_set_updated_at on public.testimonials;
create trigger trg_testimonials_set_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();

alter table public.testimonials enable row level security;

drop policy if exists testimonials_public_select on public.testimonials;
create policy testimonials_public_select
  on public.testimonials
  for select
  to anon
  using (is_public is true);

drop policy if exists testimonials_authenticated_select on public.testimonials;
create policy testimonials_authenticated_select
  on public.testimonials
  for select
  to authenticated
  using (is_public is true or auth.uid() = user_id);

drop policy if exists testimonials_insert on public.testimonials;
create policy testimonials_insert
  on public.testimonials
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists testimonials_update_admin on public.testimonials;
create policy testimonials_update_admin
  on public.testimonials
  for update
  to authenticated
  using (public.is_admin_or_owner(auth.uid()))
  with check (public.is_admin_or_owner(auth.uid()));

grant select on public.testimonials to anon;
grant select, insert, update on public.testimonials to authenticated;
