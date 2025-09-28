-- Client live chat support
alter table public.chat_conversations
  add column if not exists client_archived boolean not null default false;

alter table public.chat_conversations
  add column if not exists staff_user_id uuid references public.profiles(id) on delete set null;

create index if not exists chat_conversations_staff_user_idx
  on public.chat_conversations (staff_user_id);

update public.chat_conversations
   set client_archived = coalesce(client_archived, false);

grant update (client_archived) on public.chat_conversations to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_policies
     where schemaname = 'public'
       and tablename = 'chat_conversations'
       and policyname = 'client_update_chat_last_viewed'
  ) then
    execute 'create policy "client_update_chat_last_viewed" on public.chat_conversations
             for update
             using (auth.uid() = guest_id OR (auth.email() IS NOT NULL AND guest_email IS NOT NULL AND lower(guest_email) = lower(auth.email())))
             with check (auth.uid() = guest_id OR (auth.email() IS NOT NULL AND guest_email IS NOT NULL AND lower(guest_email) = lower(auth.email())))';
  else
    execute 'alter policy "client_update_chat_last_viewed" on public.chat_conversations
             using (auth.uid() = guest_id OR (auth.email() IS NOT NULL AND guest_email IS NOT NULL AND lower(guest_email) = lower(auth.email())))
             with check (auth.uid() = guest_id OR (auth.email() IS NOT NULL AND guest_email IS NOT NULL AND lower(guest_email) = lower(auth.email())))';
  end if;
end
$$;

create or replace function public.get_chat_conversations_with_details()
returns table (
  id uuid,
  guest_id uuid,
  staff_user_id uuid,
  staff_user_type text,
  staff_first_name text,
  staff_last_name text,
  status text,
  summary text,
  updated_at timestamptz,
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
    c.staff_user_id,
    p.user_type as staff_user_type,
    p.first_name as staff_first_name,
    p.last_name as staff_last_name,
    c.status,
    coalesce(c.summary, '') as summary,
    c.updated_at,
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
  select p.id,
         p.first_name,
         p.last_name,
         p.user_type
    from public.profiles p
   where p.user_type in ('owner', 'admin', 'prof')
     and coalesce(p.status, 'inactive') = 'active'
  order by coalesce(p.first_name, ''), coalesce(p.last_name, '');
$$;

revoke all on function public.client_list_chat_staff_users() from public;
grant execute on function public.client_list_chat_staff_users() to authenticated;

create or replace function public.client_start_chat_conversation(p_staff_user_id uuid default null)
returns public.chat_conversations
language plpgsql
security definer
set search_path = public
as
$$
declare
  v_auth_user_id uuid := auth.uid();
  v_auth_email text := auth.email();
  v_profile_guest_id uuid;
  v_staff_user_type text;
  v_staff_status text;
  v_guest_id uuid := v_auth_user_id;
  v_conversation public.chat_conversations;
begin
  if v_auth_user_id is null then
    raise exception 'Utilisateur non authentifie.';
  end if;

  begin
    select chat_guest_id
      into v_profile_guest_id
      from public.profiles
     where id = v_auth_user_id;

    if v_profile_guest_id is not null then
      v_guest_id := v_profile_guest_id;
    end if;
  exception
    when undefined_column then
      -- colonne optionnelle absente, on conserve l'uid auth
      v_profile_guest_id := null;
  end;

  if p_staff_user_id is not null then
    select user_type, status
      into v_staff_user_type, v_staff_status
      from public.profiles
     where id = p_staff_user_id;

    if v_staff_user_type is null then
      raise exception 'Destinataire introuvable.';
    end if;

    if coalesce(v_staff_status, 'inactive') <> 'active' then
      raise exception 'Destinataire inactif.';
    end if;

    if v_staff_user_type not in ('owner', 'admin', 'prof') then
      raise exception 'Destinataire non autorise.';
    end if;
  end if;

  insert into public.chat_conversations (guest_id, guest_email, status, staff_user_id, client_archived)
  values (v_guest_id, v_auth_email, 'ouvert', p_staff_user_id, false)
  returning * into v_conversation;

  return v_conversation;
end;
$$;

revoke all on function public.client_start_chat_conversation(uuid) from public;
grant execute on function public.client_start_chat_conversation(uuid) to authenticated;




