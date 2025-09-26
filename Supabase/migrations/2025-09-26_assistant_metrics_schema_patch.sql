-- Ensure assistant_metrics critical columns exist
alter table if exists public.assistant_metrics
  add column if not exists started_at timestamptz default now();

alter table if exists public.assistant_metrics
  add column if not exists ended_at timestamptz;

alter table if exists public.assistant_metrics
  add column if not exists duration_seconds integer;

alter table if exists public.assistant_metrics
  add column if not exists images_sent integer default 0;

alter table if exists public.assistant_metrics
  add column if not exists bytes_up bigint default 0;

alter table if exists public.assistant_metrics
  add column if not exists bytes_down bigint default 0;

alter table if exists public.assistant_metrics
  add column if not exists metadata jsonb default '{}'::jsonb;

comment on column public.assistant_metrics.started_at is 'Timestamp when the realtime assistant call started';
comment on column public.assistant_metrics.ended_at is 'Timestamp when the realtime assistant call ended';
comment on column public.assistant_metrics.duration_seconds is 'Duration of the session in seconds';
comment on column public.assistant_metrics.images_sent is 'Number of images uploaded by the user during the session';
comment on column public.assistant_metrics.bytes_up is 'Number of bytes uploaded during the session';
comment on column public.assistant_metrics.bytes_down is 'Number of bytes downloaded during the session';
comment on column public.assistant_metrics.metadata is 'Extra metrics payload (json)';
