-- Migration: themes table and theme RPCs
-- Date: 2025-09-18
-- Notes: Initial versioning of themes + RPCs used by the UI (ThemeContext, ThemePanel)

-- Ensure required extension for UUID generation
create extension if not exists pgcrypto;

-- 1) Table: themes
create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tokens jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.a) Keep only a single default theme at a time
-- Partial unique index to enforce at most one row with is_default = true
create unique index if not exists themes_one_default_idx
  on public.themes (is_default)
  where (is_default is true);

-- 1.b) Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end; $$ language plpgsql;

drop trigger if exists set_themes_updated_at on public.themes;
create trigger set_themes_updated_at
before update on public.themes
for each row execute function public.set_updated_at();

-- 1.c) Seed a default theme if none exists
insert into public.themes (name, tokens, is_default)
select 'Default',
       '{
          "colors": {
            "background": "hsl(222.2 84% 4.9%)",
            "foreground": "hsl(210 40% 98%)",
            "primary": "hsl(346.8 77.2% 49.8%)",
            "card": "hsl(222.2 84% 4.9%)",
            "card-foreground": "hsl(210 40% 98%)",
            "popover": "hsl(222.2 84% 4.9%)",
            "popover-foreground": "hsl(210 40% 98%)",
            "secondary": "hsl(217.2 32.6% 17.5%)",
            "secondary-foreground": "hsl(210 40% 98%)",
            "muted": "hsl(217.2 32.6% 17.5%)",
            "muted-foreground": "hsl(215 20.2% 65.1%)",
            "accent": "hsl(217.2 32.6% 17.5%)",
            "accent-foreground": "hsl(210 40% 98%)",
            "destructive": "hsl(0 62.8% 30.6%)",
            "destructive-foreground": "hsl(210 40% 98%)",
            "border": "hsl(217.2 32.6% 17.5%)",
            "input": "hsl(217.2 32.6% 17.5%)",
            "ring": "hsl(346.8 77.2% 49.8%)",
            "chat-surface": "hsl(222.2 54% 8%)",
            "chat-bubble-user": "hsl(220 32% 20%)",
            "chat-bubble-staff": "hsl(346.8 70% 45%)"
          },
          "radius": "0.5rem"
        }'::jsonb,
       true
where not exists (select 1 from public.themes);

-- 2) RPC: get_active_theme_tokens -> returns jsonb tokens for current default theme
create or replace function public.get_active_theme_tokens()
returns jsonb
language sql
stable
as $$
  select t.tokens
  from public.themes t
  where t.is_default is true
  order by t.updated_at desc
  limit 1
$$;

-- 3) RPC: set_active_theme -> mark exactly the given theme id as default
create or replace function public.set_active_theme(p_theme_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- NOTE: RLS/policies are not added here. Consider adding policies or
  -- wrapping this RPC with permission checks if needed.
  update public.themes set is_default = false where is_default is true;
  update public.themes set is_default = true where id = p_theme_id;
end;
$$;
