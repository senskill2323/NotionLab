-- Restore schema privileges required by GoTrue / PostgREST.
grant usage on schema auth to authenticator;
grant usage on schema auth to anon;
grant usage on schema auth to authenticated;
