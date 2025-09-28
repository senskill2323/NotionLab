-- Ensure admin archives set status to resolu and refresh updated_at
set check_function_bodies = off;

drop function if exists public.admin_chat_set_archived(uuid, boolean);

create function public.admin_chat_set_archived(p_id uuid, p_archived boolean)
returns table (
  id uuid,
  guest_email text,
  status text,
  admin_archived boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as
$$
declare
  v_archive boolean := coalesce(p_archived, false);
  v_new_status text := case when v_archive then 'resolu' else 'ouvert' end;
begin
  return query
    update public.chat_conversations c
       set admin_archived = v_archive,
           status = v_new_status,
           updated_at = now()
     where c.id = p_id
    returning c.id, c.guest_email, c.status, c.admin_archived, c.updated_at;
end;
$$;

grant execute on function public.admin_chat_set_archived(uuid, boolean) to authenticated;
