-- Admin Live Chat: list conversations for staff with pagination
set check_function_bodies = off;

drop function if exists public.admin_get_chat_conversations_with_details(boolean, integer, integer);

create function public.admin_get_chat_conversations_with_details(
  p_archived boolean default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  guest_id uuid,
  guest_email text,
  staff_user_id uuid,
  staff_user_type text,
  staff_first_name text,
  staff_last_name text,
  status text,
  summary text,
  updated_at timestamptz,
  admin_last_viewed_at timestamptz,
  admin_archived boolean,
  client_archived boolean,
  has_unread boolean
)
language plpgsql
security definer
set search_path = public
as
$$
declare
  v_requester record;
  v_effective_limit integer := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_effective_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  select p.id,
         coalesce(ut.type_name, p.user_type) as user_type
    into v_requester
    from public.profiles p
    left join public.user_types ut on ut.id = p.user_type_id
   where p.id = auth.uid();

  if v_requester.id is null then
    raise exception 'Acces refuse: profil introuvable pour cet utilisateur.'
      using errcode = '42501';
  end if;

  if coalesce(v_requester.user_type, '') not in ('owner', 'admin', 'prof') then
    raise exception 'Acces reserve au personnel (owner/admin/prof).'
      using errcode = '42501';
  end if;

  return query
    select
      c.id,
      c.guest_id,
      c.guest_email,
      c.staff_user_id,
      coalesce(sut.type_name, sp.user_type) as staff_user_type,
      sp.first_name as staff_first_name,
      sp.last_name as staff_last_name,
      c.status,
      coalesce(c.summary, '') as summary,
      c.updated_at,
      c.admin_last_viewed_at,
      coalesce(c.admin_archived, false) as admin_archived,
      coalesce(c.client_archived, false) as client_archived,
      exists (
        select 1
          from public.chat_messages m
         where m.conversation_id = c.id
           and coalesce(m.sender, '') = 'user'
           and (
             c.admin_last_viewed_at is null
             or m.created_at > c.admin_last_viewed_at
           )
      ) as has_unread
    from public.chat_conversations c
    left join public.profiles sp on sp.id = c.staff_user_id
    left join public.user_types sut on sut.id = sp.user_type_id
   where (p_archived is null or coalesce(c.admin_archived, false) = p_archived)
   order by c.updated_at desc
   limit v_effective_limit
  offset v_effective_offset;
end;
$$;

grant execute on function public.admin_get_chat_conversations_with_details(boolean, integer, integer) to authenticated;
