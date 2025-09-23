-- Track when admins last reviewed a live chat conversation to highlight unread client messages
alter table public.chat_conversations
  add column if not exists admin_last_viewed_at timestamptz default now();

update public.chat_conversations
   set admin_last_viewed_at = coalesce(admin_last_viewed_at, now());
