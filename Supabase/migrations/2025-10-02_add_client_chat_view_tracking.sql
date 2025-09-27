-- Track when clients last viewed their live chat conversation for unread indicators
alter table public.chat_conversations
  add column if not exists client_last_viewed_at timestamptz not null default now();

update public.chat_conversations
   set client_last_viewed_at = coalesce(client_last_viewed_at, now());

create index if not exists chat_conversations_client_last_viewed_idx
  on public.chat_conversations (client_last_viewed_at desc);

-- Ensure authenticated users can update the last viewed timestamp (and only this column)
grant update (client_last_viewed_at) on public.chat_conversations to authenticated;

do $$
begin
  if not exists (
      select 1 from pg_catalog.pg_policies
       where schemaname = 'public'
         and tablename = 'chat_conversations'
         and policyname = 'client_update_chat_last_viewed'
  ) then
    execute 'create policy "client_update_chat_last_viewed" on public.chat_conversations
             for update
             using (auth.uid() = guest_id)
             with check (auth.uid() = guest_id)';
  else
    execute 'alter policy "client_update_chat_last_viewed" on public.chat_conversations
             using (auth.uid() = guest_id)
             with check (auth.uid() = guest_id)';
  end if;
end
$$;
