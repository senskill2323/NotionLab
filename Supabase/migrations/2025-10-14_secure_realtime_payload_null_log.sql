-- Secure realtime log table exposed via PostgREST
alter table if exists public.realtime_payload_null_log enable row level security;

-- Prevent anon/authenticated from accessing the log directly
revoke all on table public.realtime_payload_null_log from anon;
revoke all on table public.realtime_payload_null_log from authenticated;
