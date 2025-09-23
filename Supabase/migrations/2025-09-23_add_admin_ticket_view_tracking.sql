-- Track when admins last reviewed a ticket to highlight unread client replies
alter table public.tickets
  add column if not exists admin_last_viewed_at timestamptz default now();

update public.tickets
   set admin_last_viewed_at = coalesce(admin_last_viewed_at, now());
