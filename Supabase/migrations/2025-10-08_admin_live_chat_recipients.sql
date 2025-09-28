-- Admin live chat recipients combining staff and clients (chat_guest_id optional)
create or replace function public.admin_list_chat_recipients()
returns table (
  id uuid,
  chat_guest_id uuid,
  email text,
  first_name text,
  last_name text,
  user_type text,
  user_type_display_name text,
  status text
)
language sql
security definer
set search_path = public
as
$$
  select
    p.id,
    null::uuid as chat_guest_id,
    p.email,
    p.first_name,
    p.last_name,
    ut.type_name as user_type,
    ut.display_name as user_type_display_name,
    p.status
  from public.profiles p
  join public.user_types ut on ut.id = p.user_type_id
  where ut.type_name in ('owner', 'admin', 'prof', 'client')
    and coalesce(p.status, 'inactive') = 'active'
  order by coalesce(p.first_name, ''), coalesce(p.last_name, '');
$$;

grant execute on function public.admin_list_chat_recipients() to authenticated;
