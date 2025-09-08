-- Trigger to initialize Kanban statuses when a submission becomes approved (Option A)

create or replace function public.on_submission_approved_init_fms()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if tg_table_name = 'formation_submissions' then
      if lower((new.submission_status)::text) in ('approved','en_ligne','en ligne','online','live')
         and lower(coalesce((old.submission_status)::text, '')) not in ('approved','en_ligne','en ligne','online','live') then
        perform public.init_kanban_statuses_for_submission(new.id);
      end if;
    elsif tg_table_name = 'formation_submission' then
      if lower((new.status)::text) in ('approved','en_ligne','en ligne','online','live')
         and lower(coalesce((old.status)::text, '')) not in ('approved','en_ligne','en ligne','online','live') then
        perform public.init_kanban_statuses_for_submission(new.id);
      end if;
    elsif tg_table_name = 'user_formation_submissions' then
      if lower((new.submission_status)::text) in ('approved','en_ligne','en ligne','online','live')
         and lower(coalesce((old.submission_status)::text, '')) not in ('approved','en_ligne','en ligne','online','live') then
        perform public.init_kanban_statuses_for_submission(new.id);
      end if;
    end if;
  end if;
  return new;
end
$$;

-- Create triggers idempotently
do $$
begin
  if to_regclass('public.formation_submissions') is not null then
    if not exists (
      select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where t.tgname = 'trg_fs_plural_approved_init_fms' and n.nspname='public' and c.relname='formation_submissions'
    ) then
      create trigger trg_fs_plural_approved_init_fms
      after update on public.formation_submissions
      for each row
      execute function public.on_submission_approved_init_fms();
    end if;
  end if;

  if to_regclass('public.formation_submission') is not null then
    if not exists (
      select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where t.tgname = 'trg_fs_approved_init_fms' and n.nspname='public' and c.relname='formation_submission'
    ) then
      create trigger trg_fs_approved_init_fms
      after update on public.formation_submission
      for each row
      execute function public.on_submission_approved_init_fms();
    end if;
  end if;

  if to_regclass('public.user_formation_submissions') is not null then
    if not exists (
      select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where t.tgname = 'trg_ufs_approved_init_fms' and n.nspname='public' and c.relname='user_formation_submissions'
    ) then
      create trigger trg_ufs_approved_init_fms
      after update on public.user_formation_submissions
      for each row
      execute function public.on_submission_approved_init_fms();
    end if;
  end if;
end$$;
