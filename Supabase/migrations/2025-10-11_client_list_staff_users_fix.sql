-- Align client RPC to use user_types
create or replace function public.client_list_chat_staff_users()
returns table (
  id uuid,
  first_name text,
  last_name text,
  user_type text
)
language sql
security definer
set search_path = public
as
$$
  select
    p.id,
    p.first_name,
    p.last_name,
    coalesce(ut.type_name, p.user_type) as user_type
  from public.profiles p
  left join public.user_types ut on ut.id = p.user_type_id
  where coalesce(coalesce(ut.type_name, p.user_type), '') in ('owner', 'admin', 'prof')
    and coalesce(p.status, 'inactive') = 'active'
  order by coalesce(p.first_name, ''), coalesce(p.last_name, '');
$$;

grant execute on function public.client_list_chat_staff_users() to authenticated;

