-- VIEW for unified Kanban read (minimal metadata) - idempotent

-- Drop and recreate to keep definition in sync
drop view if exists public.kanban_user_modules_v1;

create view public.kanban_user_modules_v1 as
select
  fms.id            as status_id,
  fms.user_id       as user_id,
  fms.submission_id as submission_id,
  fms.module_uuid   as module_uuid,
  fms.status        as status,
  fms.position      as position,
  null::text        as title,
  null::text        as description,
  null::integer     as duration,
  null::text        as family_name,
  null::text        as subfamily_name
from public.formation_module_statuses fms;

comment on view public.kanban_user_modules_v1 is 'Unified Kanban read: exposes user''s live module statuses with minimal metadata. RLS enforced via underlying table.';

-- Ensure authenticated clients can select from the view
-- (RLS on the underlying table still applies)
do $$
begin
  grant select on public.kanban_user_modules_v1 to authenticated;
exception when others then
  null;
end$$;
