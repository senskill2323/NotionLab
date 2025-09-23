-- Track when clients last opened a ticket so we can highlight new admin replies
alter table public.tickets
  add column if not exists client_last_viewed_at timestamptz default now();

update public.tickets
   set client_last_viewed_at = coalesce(client_last_viewed_at, now());
