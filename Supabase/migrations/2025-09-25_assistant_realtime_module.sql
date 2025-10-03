-- Assistant realtime module setup
create table if not exists public.assistant_settings (
  id uuid primary key default gen_random_uuid(),
  is_active boolean not null default true,
  model text not null,
  voice text,
  realtime_url text not null default 'https://api.openai.com/v1/realtime',
  session_config jsonb not null default '{}'::jsonb,
  video_enabled boolean not null default false,
  ice_servers jsonb not null default '[]'::jsonb,
  flags jsonb not null default '{}'::jsonb,
  max_reconnect_attempts integer not null default 3,
  reconnect_backoff_ms integer not null default 2000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists assistant_settings_active_idx
  on public.assistant_settings (is_active)
  where is_active;

drop trigger if exists set_assistant_settings_updated_at on public.assistant_settings;
create trigger set_assistant_settings_updated_at
  before update on public.assistant_settings
  for each row execute function public.set_updated_at();

alter table public.assistant_settings enable row level security;

drop policy if exists assistant_settings_select on public.assistant_settings;
create policy assistant_settings_select
  on public.assistant_settings
  for select
  to authenticated
  using (is_active is true);

drop policy if exists assistant_settings_update on public.assistant_settings;
create policy assistant_settings_update
  on public.assistant_settings
  for update
  to authenticated
  using (public.is_admin_or_owner(auth.uid()))
  with check (public.is_admin_or_owner(auth.uid()));

grant select on public.assistant_settings to authenticated;

insert into public.assistant_settings (is_active, model, voice)
select true, 'gpt-4o-realtime-preview', 'verse'
where not exists (
  select 1 from public.assistant_settings where is_active is true
);

create table if not exists public.assistant_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  minutes_per_day integer not null default 15,
  concurrent_sessions integer not null default 1,
  images_per_session integer not null default 8,
  seconds_used_today integer not null default 0,
  images_sent_today integer not null default 0,
  sessions_started_today integer not null default 0,
  last_reset_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_assistant_limits_updated_at on public.assistant_limits;
create trigger set_assistant_limits_updated_at
  before update on public.assistant_limits
  for each row execute function public.set_updated_at();

alter table public.assistant_limits enable row level security;

drop policy if exists assistant_limits_select on public.assistant_limits;
create policy assistant_limits_select
  on public.assistant_limits
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists assistant_limits_insert on public.assistant_limits;
create policy assistant_limits_insert
  on public.assistant_limits
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists assistant_limits_update on public.assistant_limits;
create policy assistant_limits_update
  on public.assistant_limits
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.assistant_limits to authenticated;

create table if not exists public.assistant_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  error_code text,
  error_message text,
  images_sent integer not null default 0,
  bytes_up bigint not null default 0,
  bytes_down bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists assistant_metrics_user_session_idx
  on public.assistant_metrics(user_id, session_id);

drop trigger if exists set_assistant_metrics_updated_at on public.assistant_metrics;
create trigger set_assistant_metrics_updated_at
  before update on public.assistant_metrics
  for each row execute function public.set_updated_at();

alter table public.assistant_metrics enable row level security;

drop policy if exists assistant_metrics_select on public.assistant_metrics;
create policy assistant_metrics_select
  on public.assistant_metrics
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists assistant_metrics_insert on public.assistant_metrics;
create policy assistant_metrics_insert
  on public.assistant_metrics
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists assistant_metrics_update on public.assistant_metrics;
create policy assistant_metrics_update
  on public.assistant_metrics
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.assistant_metrics to authenticated;

insert into public.role_permissions (permission, description, client, vip, admin, prof, guest, family, display_order)
values ('assistant:use', 'Access to the AI assistant module', true, true, true, true, false, 'dashboard', 120)
on conflict (permission) do update set
  description = excluded.description,
  client = excluded.client,
  vip = excluded.vip,
  admin = excluded.admin,
  prof = excluded.prof,
  guest = excluded.guest,
  family = coalesce(excluded.family, role_permissions.family),
  display_order = coalesce(excluded.display_order, role_permissions.display_order);

insert into public.modules_registry (module_key, name, description, required_permission, is_active, default_layout)
values ('client_ai_assistant', 'Assistant IA', 'Assistant IA realtime for clients.', 'assistant:use', true, '{"span":12}'::jsonb)
on conflict (module_key) do update set
  name = excluded.name,
  description = excluded.description,
  required_permission = excluded.required_permission,
  is_active = excluded.is_active,
  default_layout = excluded.default_layout;

insert into public.component_rules (component_key, description, family, anonymous_state, guest_state, client_state, vip_state, prof_state, admin_state, display_order)
values ('nav:assistant', 'Assistant button', 'Elements Globaux', 'hidden', 'hidden', 'visible', 'visible', 'visible', 'visible', 130)
on conflict (component_key) do update set
  description = excluded.description,
  family = excluded.family,
  anonymous_state = excluded.anonymous_state,
  guest_state = excluded.guest_state,
  client_state = excluded.client_state,
  vip_state = excluded.vip_state,
  prof_state = excluded.prof_state,
  admin_state = excluded.admin_state,
  display_order = excluded.display_order;
