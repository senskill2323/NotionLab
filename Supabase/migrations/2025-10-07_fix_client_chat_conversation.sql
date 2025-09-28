-- Ensure client chat conversation creation reuses existing threads instead of failing on duplicates
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
  v_guest_id uuid := v_auth_user_id;
  v_staff_user_type text;
  v_staff_status text;
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

  -- Reuse an existing non resolu/abandonne conversation when possible
  select c.*
    into v_conversation
    from public.chat_conversations c
   where (
          (v_guest_id is not null and c.guest_id = v_guest_id)
       or (
            v_auth_email is not null
        and c.guest_email is not null
        and lower(c.guest_email) = lower(v_auth_email)
          )
        )
     and coalesce(c.status, 'ouvert') not in ('resolu', 'abandonne')
   order by c.updated_at desc nulls last, c.created_at desc
   limit 1;

  if v_conversation.id is not null then
    if v_conversation.client_archived
       or (p_staff_user_id is not null and (v_conversation.staff_user_id is distinct from p_staff_user_id))
       or (v_guest_id is not null and (v_conversation.guest_id is distinct from v_guest_id))
       or (v_auth_email is not null and v_conversation.guest_email is distinct from v_auth_email)
    then
      update public.chat_conversations
         set client_archived = false,
             staff_user_id = coalesce(p_staff_user_id, v_conversation.staff_user_id),
             guest_id = coalesce(v_guest_id, v_conversation.guest_id),
             guest_email = coalesce(v_auth_email, v_conversation.guest_email),
             status = case
               when coalesce(v_conversation.status, 'ouvert') in ('resolu', 'abandonne') then 'ouvert'
               else v_conversation.status
             end,
             updated_at = now()
       where id = v_conversation.id
       returning * into v_conversation;
    end if;

    return v_conversation;
  end if;

  begin
    insert into public.chat_conversations (guest_id, guest_email, status, staff_user_id, client_archived)
    values (v_guest_id, v_auth_email, 'ouvert', p_staff_user_id, false)
    returning * into v_conversation;
  exception
    when unique_violation then
      select c.*
        into v_conversation
        from public.chat_conversations c
       where (
              (v_guest_id is not null and c.guest_id = v_guest_id)
           or (
                v_auth_email is not null
            and c.guest_email is not null
            and lower(c.guest_email) = lower(v_auth_email)
              )
            )
       order by c.updated_at desc nulls last, c.created_at desc
       limit 1;

      if v_conversation.id is null then
        raise;
      end if;

      if v_conversation.client_archived
       or (p_staff_user_id is not null and (v_conversation.staff_user_id is distinct from p_staff_user_id))
       or (v_guest_id is not null and (v_conversation.guest_id is distinct from v_guest_id))
       or (v_auth_email is not null and v_conversation.guest_email is distinct from v_auth_email)
      then
        update public.chat_conversations
           set client_archived = false,
             staff_user_id = coalesce(p_staff_user_id, v_conversation.staff_user_id),
             guest_id = coalesce(v_guest_id, v_conversation.guest_id),
             guest_email = coalesce(v_auth_email, v_conversation.guest_email),
             status = case
               when coalesce(v_conversation.status, 'ouvert') in ('resolu', 'abandonne') then 'ouvert'
               else v_conversation.status
             end,
             updated_at = now()
         where id = v_conversation.id
         returning * into v_conversation;
      end if;
  end;

  return v_conversation;
end;
$$;

revoke all on function public.client_start_chat_conversation(uuid) from public;
grant execute on function public.client_start_chat_conversation(uuid) to authenticated;









