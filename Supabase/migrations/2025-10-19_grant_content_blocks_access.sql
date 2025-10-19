-- Ensure Supabase anon/authenticated roles can read content blocks.
grant select on public.content_blocks to anon, authenticated;
