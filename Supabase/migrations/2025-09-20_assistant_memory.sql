-- Assistant long-term memory table
create table if not exists public.assistant_memories (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.assistant_memories enable row level security;

-- RLS: user can read/update only their own memory
create policy assistant_memories_select_own on public.assistant_memories
for select using (auth.uid() = user_id);

create policy assistant_memories_insert_own on public.assistant_memories
for insert with check (auth.uid() = user_id);

create policy assistant_memories_update_own on public.assistant_memories
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Admin/owner helper (optional): if your project has is_admin_or_owner(uid) you can grant broader access.
-- Uncomment if needed
-- create policy assistant_memories_admin_rw on public.assistant_memories
-- for all using (public.is_admin_or_owner(auth.uid())) with check (public.is_admin_or_owner(auth.uid()));

-- Helpful index for JSON containment queries if needed later
create index if not exists assistant_memories_updated_at_idx on public.assistant_memories(updated_at);
