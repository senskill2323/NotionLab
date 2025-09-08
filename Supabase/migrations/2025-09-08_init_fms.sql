-- Initialize Kanban statuses for a given approved submission (Option A - figé)
-- Tries to support both 'formation_submission' (status) and 'user_formation_submissions' (submission_status)
-- Standard: extracts modules from user_formation_snapshots (best-effort: detects JSON column and common paths)
-- Custom: extracts modules from courses.nodes (expects type 'moduleNode' and data.moduleId)

create extension if not exists pgcrypto;

create or replace function public.init_kanban_statuses_for_submission(p_submission_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $init$
declare
  v_has_fs  boolean;
  v_has_ufs boolean;
  v_has_fs_plural boolean;
  v_fs_status_col text;
  v_user_id uuid;
  v_course_id uuid;
  v_is_approved boolean := false;
  v_course_type text;
  v_inserted int := 0;
  v_has_snap boolean := false;
  v_snap_json_col text;
begin
  -- Detect which submission table exists
  v_has_fs_plural := to_regclass('public.formation_submissions') is not null;
  v_has_fs  := to_regclass('public.formation_submission') is not null;
  v_has_ufs := to_regclass('public.user_formation_submissions') is not null;

  if v_has_fs_plural then
    -- detect status column name on formation_submissions
    select c.column_name into v_fs_status_col
    from information_schema.columns c
    where c.table_schema='public' and c.table_name='formation_submissions'
      and c.column_name in ('status','submission_status','state')
    order by case when c.column_name='status' then 0 when c.column_name='submission_status' then 1 else 2 end
    limit 1;

    if v_fs_status_col is null then
      raise exception 'Cannot find a status column on formation_submissions (expected one of: status, submission_status, state)';
    end if;

    execute format('select user_id, course_id, (lower((%I)::text) in (''approved'',''en_ligne'',''en ligne'',''online'',''live'')) from public.formation_submissions where id = $1', v_fs_status_col)
    into v_user_id, v_course_id, v_is_approved
    using p_submission_id;
  elsif v_has_fs then
    select s.user_id, s.course_id, (lower((s.status)::text) in ('approved','en_ligne','en ligne','online','live'))
    into v_user_id, v_course_id, v_is_approved
    from public.formation_submission s
    where s.id = p_submission_id;
  elsif v_has_ufs then
    select s.user_id, s.course_id, (lower((s.submission_status)::text) in ('approved','en_ligne','en ligne','online','live'))
    into v_user_id, v_course_id, v_is_approved
    from public.user_formation_submissions s
    where s.id = p_submission_id;
  else
    raise exception 'No submission table found (formation_submission or user_formation_submissions)';
  end if;

  if v_user_id is null or v_course_id is null then
    -- Unknown submission id
    return 0;
  end if;

  if not v_is_approved then
    -- Only initialize for approved/live submissions
    return 0;
  end if;

  -- Course type
  select c.course_type into v_course_type
  from public.courses c where c.id = v_course_id;

  -- Avoid duplicates: rely on ON CONFLICT later

  if lower(coalesce(v_course_type::text, '')) = 'custom' then
    -- Extract modules from courses.nodes (custom parcours)
    with nodes as (
      select e.elem as node, (e.ord - 1) as position
      from public.courses c
      cross join lateral jsonb_array_elements(coalesce(c.nodes, '[]'::jsonb)) with ordinality as e(elem, ord)
      where c.id = v_course_id
    ), mods as (
      select distinct
        (node->'data'->>'moduleId')::uuid as module_uuid,
        position
      from nodes
      where (node->>'type') in ('moduleNode','module')
        and (node->'data'->>'moduleId') is not null
    )
    insert into public.formation_module_statuses (id, user_id, submission_id, module_uuid, status, position)
    select gen_random_uuid(), v_user_id, p_submission_id, m.module_uuid, 'todo', m.position
    from mods m
    where m.module_uuid is not null
    on conflict (submission_id, module_uuid) do nothing;

    get diagnostics v_inserted = row_count;

    -- Fallback: if snapshot had no modules, try current course nodes
    if v_inserted = 0 then
      with nodes as (
        select e.elem as node, (e.ord - 1) as position
        from public.courses c
        cross join lateral jsonb_array_elements(coalesce(c.nodes, '[]'::jsonb)) with ordinality as e(elem, ord)
        where c.id = v_course_id
      ), mods as (
        select distinct
          (node->'data'->>'moduleId')::uuid as module_uuid,
          position
        from nodes
        where (node->>'type') in ('moduleNode','module')
          and (node->'data'->>'moduleId') is not null
      )
      insert into public.formation_module_statuses (id, user_id, submission_id, module_uuid, status, position)
      select gen_random_uuid(), v_user_id, p_submission_id, m.module_uuid, 'todo', m.position
      from mods m
      where m.module_uuid is not null
      on conflict (submission_id, module_uuid) do nothing;

      get diagnostics v_inserted = row_count;
    end if;

  else
    -- Standard: extract from formation_submissions.course_snapshot (if present)
    with s as (
      select fs.course_snapshot as payload
      from public.formation_submissions fs
      where fs.id = p_submission_id
      limit 1
    ), elems as (
      -- Path A: direct modules arrays
      select elem, ord
      from s
      cross join lateral jsonb_array_elements(
               coalesce(payload->'modules', payload->'module_list', payload->'content'->'modules')
             ) with ordinality as elem(elem, ord)
      union all
      -- Path B: content.nodes array (node objects, expect data.moduleId)
      select elem, ord
      from s
      cross join lateral jsonb_array_elements(coalesce(payload->'content'->'nodes', '[]'::jsonb)) with ordinality as elem(elem, ord)
    ), mods as (
      select distinct
        coalesce(
          (elem->>'module_uuid')::uuid,
          (elem->>'moduleId')::uuid,
          (elem->'data'->>'moduleId')::uuid,
          (elem->>'uuid')::uuid,
          (elem->>'id')::uuid
        ) as module_uuid,
        (ord - 1) as position
      from elems
    )
    insert into public.formation_module_statuses (id, user_id, submission_id, module_uuid, status, position)
    select gen_random_uuid(), v_user_id, p_submission_id, m.module_uuid, 'todo', m.position
    from mods m
    where m.module_uuid is not null
    on conflict (submission_id, module_uuid) do nothing;

    get diagnostics v_inserted = row_count;
  end if;

  return v_inserted;
end
$init$;

do $do$
begin
  grant execute on function public.init_kanban_statuses_for_submission(uuid) to authenticated;
exception when others then null;
end$do$;
