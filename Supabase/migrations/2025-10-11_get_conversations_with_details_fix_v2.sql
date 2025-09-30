-- Adjust return signature to match existing DB function
create or replace function public.get_chat_conversations_with_details()
returns table (
  id uuid,
  guest_id uuid,
  guest_email text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  staff_user_id uuid,
  staff_user_type text,
  staff_first_name text,
  staff_last_name text,
  summary text,
  client_last_viewed_at timestamptz,
  has_unread boolean,
  client_archived boolean
)
language sql
security definer
set search_path = public
as
$$
  with current_identity as (
    select auth.uid() as user_id, auth.email() as user_email
  )
  select
    c.id,
    c.guest_id,
    c.guest_email,
    c.status,
    c.created_at,
    c.updated_at,
    c.staff_user_id,
    coalesce(sut.type_name, p.user_type) as staff_user_type,
    p.first_name as staff_first_name,
    p.last_name as staff_last_name,
    coalesce(c.summary, '') as summary,
    c.client_last_viewed_at,
    exists (
      select 1
        from public.chat_messages m
       where m.conversation_id = c.id
         and m.sender in ('admin', 'owner', 'prof')
         and (
           c.client_last_viewed_at is null
           or m.created_at > c.client_last_viewed_at
         )
    ) as has_unread,
    coalesce(c.client_archived, false) as client_archived
  from public.chat_conversations c
  left join public.profiles p on p.id = c.staff_user_id
  left join public.user_types sut on sut.id = p.user_type_id
  cross join current_identity ci
  where (
    c.guest_id = ci.user_id
    or (
      ci.user_email is not null
      and c.guest_email is not null
      and lower(c.guest_email) = lower(ci.user_email)
    )
  )
  order by c.updated_at desc;
$$;

revoke all on function public.get_chat_conversations_with_details() from public;
grant execute on function public.get_chat_conversations_with_details() to authenticated;

