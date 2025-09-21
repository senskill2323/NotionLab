-- Assistant admin config and limits
-- Create assistant_settings singleton table
create table if not exists public.assistant_settings (
  id text primary key default 'GLOBAL',
  enabled boolean not null default true,
  instructions text,
  voice text,
  speech_rate smallint not null default 5 check (speech_rate between 1 and 10),
  enable_audio boolean not null default true,
  enable_text boolean not null default true,
  enable_vision boolean not null default true,
  push_to_talk_default boolean not null default false,
  default_language text not null default 'fr',
  allow_language_auto boolean not null default true,
  rag_url text,
  memory_write_url text,
  memory_search_url text,
  write_memory_default boolean not null default true,
  rag_error_message text not null default 'Je n’ai pas accès à tes documents pour le moment. Je tente un accès générique et je me reconnecte si possible.',
  reconnect_message text not null default 'Connexion instable, je tente de me reconnecter…',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public._touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

create trigger assistant_settings_touch
before update on public.assistant_settings
for each row execute function public._touch_updated_at();

-- Ensure singleton row exists
insert into public.assistant_settings(id)
values ('GLOBAL')
on conflict (id) do nothing;

-- Limits table (global or per-user)
create table if not exists public.assistant_limits (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global','user')),
  user_id uuid null,
  max_session_seconds integer not null default 900,
  max_bitrate_kbps integer not null default 64,
  max_rag_context_kb integer not null default 256,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint assistant_limits_user_null check ((scope='global' and user_id is null) or (scope='user' and user_id is not null))
);

create trigger assistant_limits_touch
before update on public.assistant_limits
for each row execute function public._touch_updated_at();

-- Metrics table (observability)
create table if not exists public.assistant_metrics (
  id bigserial primary key,
  ts timestamptz not null default now(),
  user_id uuid null,
  session_id uuid null,
  source text not null default 'edge',
  event text not null,
  latency_ms integer null,
  rag_error boolean null,
  answer_chars integer null,
  rag_sources_count integer null,
  extra jsonb null
);

-- RLS
alter table public.assistant_settings enable row level security;
alter table public.assistant_limits enable row level security;
alter table public.assistant_metrics enable row level security;

-- Owner-only write, authenticated read settings
create policy assistant_settings_select_auth on public.assistant_settings
for select using (auth.role() = 'authenticated');

create policy assistant_settings_modify_owner_ins on public.assistant_settings
for insert with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'owner'));

create policy assistant_settings_modify_owner_upd on public.assistant_settings
for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'owner'));

-- Limits: authenticated can read, owner can write
create policy assistant_limits_select_auth on public.assistant_limits
for select using (auth.role() = 'authenticated');

create policy assistant_limits_modify_owner_ins on public.assistant_limits
for insert with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'owner'));

create policy assistant_limits_modify_owner_upd on public.assistant_limits
for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'owner'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'owner'));

-- Metrics: owner can read; no write restriction (writes via server-side contexts or edge, still under caller auth)
create policy assistant_metrics_select_owner on public.assistant_metrics
for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.user_type = 'owner'));

-- Allow authenticated inserts for metrics (events produced by users via Edge)
create policy assistant_metrics_insert_auth on public.assistant_metrics
for insert with check (auth.role() = 'authenticated');
