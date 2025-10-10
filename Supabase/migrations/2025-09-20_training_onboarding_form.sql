-- Migration: onboarding training form & admin module
-- Date: 2025-09-20

create extension if not exists pgcrypto;

alter table if exists public.profiles
  add column if not exists profession text;

create table if not exists public.training_onboarding_sections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  icon text not null,
  step_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_onboarding_questions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.training_onboarding_sections(id) on delete cascade,
  slug text not null unique,
  label text not null,
  description text,
  helper_text text,
  placeholder text,
  type text not null,
  allow_multiple boolean not null default false,
  allow_other boolean not null default false,
  other_label text,
  other_placeholder text,
  is_required boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_onboarding_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.training_onboarding_questions(id) on delete cascade,
  value text not null,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_onboarding_question_options_unique unique (question_id, value)
);

create index if not exists training_onboarding_question_options_question_order_idx
  on public.training_onboarding_question_options(question_id, sort_order);

create index if not exists training_onboarding_questions_section_order_idx
  on public.training_onboarding_questions(section_id, sort_order);

create table if not exists public.training_onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  draft_answers jsonb not null default '{}'::jsonb,
  submitted_answers jsonb,
  status text not null default 'draft',
  draft_saved_at timestamptz not null default now(),
  first_submitted_at timestamptz,
  last_submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_onboarding_responses_user_unique unique (user_id),
  constraint training_onboarding_responses_status_check check (status in ('draft','submitted'))
);

create table if not exists public.training_onboarding_nps (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.training_onboarding_responses(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  answer boolean,
  comment text,
  created_at timestamptz not null default now(),
  constraint training_onboarding_nps_response_unique unique (response_id)
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_training_onboarding_sections_updated_at on public.training_onboarding_sections;
create trigger trg_training_onboarding_sections_updated_at
before update on public.training_onboarding_sections
for each row execute function public.set_updated_at();

drop trigger if exists trg_training_onboarding_questions_updated_at on public.training_onboarding_questions;
create trigger trg_training_onboarding_questions_updated_at
before update on public.training_onboarding_questions
for each row execute function public.set_updated_at();

drop trigger if exists trg_training_onboarding_question_options_updated_at on public.training_onboarding_question_options;
create trigger trg_training_onboarding_question_options_updated_at
before update on public.training_onboarding_question_options
for each row execute function public.set_updated_at();

drop trigger if exists trg_training_onboarding_responses_updated_at on public.training_onboarding_responses;
create trigger trg_training_onboarding_responses_updated_at
before update on public.training_onboarding_responses
for each row execute function public.set_updated_at();

alter table public.training_onboarding_sections enable row level security;
alter table public.training_onboarding_questions enable row level security;
alter table public.training_onboarding_question_options enable row level security;
alter table public.training_onboarding_responses enable row level security;
alter table public.training_onboarding_nps enable row level security;

do $$
begin
  grant usage on schema public to authenticated;
exception when others then null;
end$$;

grant select on public.training_onboarding_sections to authenticated;
grant select on public.training_onboarding_questions to authenticated;
grant select on public.training_onboarding_question_options to authenticated;
grant select, insert, update on public.training_onboarding_responses to authenticated;
grant select, insert, update on public.training_onboarding_nps to authenticated;

-- Policies for sections (select all authenticated, admin manage)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='training_onboarding_sections'
      and policyname='training_onboarding_sections_select'
  ) then
    create policy training_onboarding_sections_select
      on public.training_onboarding_sections
      for select
      using (true);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='training_onboarding_sections'
      and policyname='training_onboarding_sections_admin_manage'
  ) then
    create policy training_onboarding_sections_admin_manage
      on public.training_onboarding_sections
      for all
      using (
        exists (
          select 1
          from public.profiles p
          join public.user_types ut on ut.id = p.user_type_id
          where p.id = auth.uid()
            and ut.type_name in ('owner','admin','prof')
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          join public.user_types ut on ut.id = p.user_type_id
          where p.id = auth.uid()
            and ut.type_name in ('owner','admin','prof')
        )
      );
  end if;
end$$;

-- Policies for questions
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='training_onboarding_questions'
      and policyname='training_onboarding_questions_select'
  ) then
    create policy training_onboarding_questions_select
      on public.training_onboarding_questions
      for select
      using (true);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='training_onboarding_questions'
      and policyname='training_onboarding_questions_admin_manage'
  ) then
    create policy training_onboarding_questions_admin_manage
      on public.training_onboarding_questions
      for all
      using (
        exists (
          select 1
          from public.profiles p
          join public.user_types ut on ut.id = p.user_type_id
          where p.id = auth.uid()
            and ut.type_name in ('owner','admin','prof')
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          join public.user_types ut on ut.id = p.user_type_id
          where p.id = auth.uid()
            and ut.type_name in ('owner','admin','prof')
        )
      );
  end if;
end$$;

-- Policies for question options
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='training_onboarding_question_options'
      and policyname='training_onboarding_question_options_select'
  ) then
    create policy training_onboarding_question_options_select
      on public.training_onboarding_question_options
      for select
      using (true);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='training_onboarding_question_options'
      and policyname='training_onboarding_question_options_admin_manage'
  ) then
    create policy training_onboarding_question_options_admin_manage
      on public.training_onboarding_question_options
      for all
      using (
        exists (
          select 1
          from public.profiles p
          join public.user_types ut on ut.id = p.user_type_id
          where p.id = auth.uid()
            and ut.type_name in ('owner','admin','prof')
        )
      )
      with check (
        exists (
          select 1
          from public.profiles p
          join public.user_types ut on ut.id = p.user_type_id
          where p.id = auth.uid()
            and ut.type_name in ('owner','admin','prof')
        )
      );
  end if;
end$$;

-- Policies for responses
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='training_onboarding_responses'
      and policyname='training_onboarding_responses_select_own'
  ) then
    create policy training_onboarding_responses_select_own
      on public.training_onboarding_responses
      for select
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='training_onboarding_responses'
      and policyname='training_onboarding_responses_select_admin'
  ) then
    create policy training_onboarding_responses_select_admin
      on public.training_onboarding_responses
      for select
      using (
        exists (
          select 1
          from public.profiles p
          join public.user_types ut on ut.id = p.user_type_id
          where p.id = auth.uid()
            and ut.type_name in ('owner','admin','prof')
        )
      );
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='training_onboarding_responses'
      and policyname='training_onboarding_responses_insert_own'
  ) then
    create policy training_onboarding_responses_insert_own
      on public.training_onboarding_responses
      for insert
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='training_onboarding_responses'
      and policyname='training_onboarding_responses_update_own'
  ) then
    create policy training_onboarding_responses_update_own
      on public.training_onboarding_responses
      for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end$$;

-- Policies for NPS
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='training_onboarding_nps'
      and policyname='training_onboarding_nps_select_own'
  ) then
    create policy training_onboarding_nps_select_own
      on public.training_onboarding_nps
      for select
      using (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='training_onboarding_nps'
      and policyname='training_onboarding_nps_select_admin'
  ) then
    create policy training_onboarding_nps_select_admin
      on public.training_onboarding_nps
      for select
      using (
        exists (
          select 1
          from public.profiles p
          join public.user_types ut on ut.id = p.user_type_id
          where p.id = auth.uid()
            and ut.type_name in ('owner','admin','prof')
        )
      );
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='training_onboarding_nps'
      and policyname='training_onboarding_nps_insert_own'
  ) then
    create policy training_onboarding_nps_insert_own
      on public.training_onboarding_nps
      for insert
      with check (user_id = auth.uid());
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='training_onboarding_nps'
      and policyname='training_onboarding_nps_update_own'
  ) then
    create policy training_onboarding_nps_update_own
      on public.training_onboarding_nps
      for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end$$;

-- Seed sections
insert into public.training_onboarding_sections (slug, title, description, icon, step_order)
values
  ('format_mode', 'Format & mode', 'Choisis le format de la formation et l''accompagnement souhait?.', 'Monitor', 1),
  ('objectifs_livrables', 'Objectifs & livrables', 'D?finis les r?sultats attendus de la formation.', 'Target', 2),
  ('domaines', 'Domaines ? piloter', 'Liste les espaces Notion ? cadrer en priorité?.', 'LayoutDashboard', 3),
  ('niveau_notion', 'Connaissances Notion', 'Situe ton niveau actuel sur les briques cl?s de Notion.', 'Brain', 4),
  ('outils_actuels', 'Outils actuels', 'Les outils que tu utilises aujourd''hui.', 'Boxes', 5),
  ('ia_automatisation', 'IA & automatisations', 'Ton usage de l''IA et des automatisations.', 'Bot', 6),
  ('bases_prioritaires', 'Bases ? d?marrer', 'Les bases Notion ? lancer en premier.', 'Database', 7),
  ('competences_it', 'Comp?tences IT', 'Ton aisance informatique globale.', 'Cpu', 8),
  ('contexte_materiel', 'Contexte & mat?riel', 'Comprendre ton environnement de travail.', 'Laptop', 9),
  ('attentes_pedagogiques', 'Attentes p?dagogiques', 'Cadre tes attentes pour les s?ances.', 'GraduationCap', 10)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  step_order = excluded.step_order;

-- Seed questions
insert into public.training_onboarding_questions (
  section_id,
  slug,
  label,
  description,
  helper_text,
  placeholder,
  type,
  allow_multiple,
  allow_other,
  other_label,
  other_placeholder,
  sort_order,
  metadata
)
select
  s.id,
  q.slug,
  q.label,
  q.description,
  q.helper_text,
  q.placeholder,
  q.type,
  q.allow_multiple,
  q.allow_other,
  q.other_label,
  q.other_placeholder,
  q.sort_order,
  q.metadata
from (
  values
    ('format_mode','format','Quel format de s?ance pr?f?res-tu ?',null,'Tu peux cocher plusieurs formats.',null,'multi_choice',true,false,null,null,10,'{}'::jsonb),
    ('format_mode','mode_accompagnement','Quel mode de collaboration t''int?resse ?',null,null,null,'single_choice',false,false,null,null,20,'{}'::jsonb),
    ('format_mode','disponibilites','Quelles sont tes disponibilit?s habituelles ?',null,'Indique les cr?neaux ou jours qui t''arrangent.','Ex. lundi matin, jeudi apr?s-midi','text_short',false,false,null,null,30,'{}'::jsonb),

    ('objectifs_livrables','objectif_principal','Quel est ton objectif principal ?',null,'Une phrase suffit.','Ex. structurer mon CRM et mon pipeline','text_short',false,false,null,null,10,'{}'::jsonb),
    ('objectifs_livrables','livrables','Quels livrables souhaites-tu obtenir ?',null,'S?lectionne tous les livrables utiles.',null,'multi_choice',true,true,'Autre','Pr?cise les livrables attendus',20,'{}'::jsonb),

    ('domaines','domaines_piloter','Quels domaines veux-tu piloter dans Notion ?',null,'S?lectionne toutes les zones concern?es.',null,'multi_choice',true,true,'Autre','Pr?cise le domaine ? couvrir',10,'{}'::jsonb),

    ('niveau_notion','notion_experience','As-tu d?j? utilis? Notion ?',null,null,null,'single_choice',false,false,null,null,5,'{}'::jsonb),
    ('niveau_notion','notion_niveau_global','Niveau g?n?ral Notion',null,'Glisse le curseur pour situer ton niveau.',null,'slider',false,false,null,null,10,
      jsonb_build_object(
        'min',1,'max',5,'step',1,
        'labels',jsonb_build_object(
          '1','D?couverte',
          '2','D?butant',
          '3','Interm?diaire autonome',
          '4','Avanc? (compose des bases)',
          '5','Expert (con?oit seul)'
        )
      )
    ),
    ('niveau_notion','notion_niveau_bdd','Niveau sur les bases de donn?es',null,null,null,'slider',false,false,null,null,20,
      jsonb_build_object(
        'min',1,'max',5,'step',1,
        'labels',jsonb_build_object(
          '1','D?couverte',
          '2','D?butant',
          '3','Interm?diaire autonome',
          '4','Avanc? (compose des bases)',
          '5','Expert (con?oit seul)'
        )
      )
    ),
    ('niveau_notion','notion_niveau_formules','Niveau sur les formules',null,null,null,'slider',false,false,null,null,30,
      jsonb_build_object(
        'min',1,'max',5,'step',1,
        'labels',jsonb_build_object(
          '1','D?couverte',
          '2','D?butant',
          '3','Interm?diaire autonome',
          '4','Avanc? (compose des bases)',
          '5','Expert (con?oit seul)'
        )
      )
    ),
    ('niveau_notion','notion_niveau_relations','Niveau sur les relations et liaisons',null,null,null,'slider',false,false,null,null,40,
      jsonb_build_object(
        'min',1,'max',5,'step',1,
        'labels',jsonb_build_object(
          '1','D?couverte',
          '2','D?butant',
          '3','Interm?diaire autonome',
          '4','Avanc? (compose des bases)',
          '5','Expert (con?oit seul)'
        )
      )
    ),

    ('outils_actuels','outils_notes','Quels outils utilises-tu pour tes notes ?',null,'S?lectionne tout ce qui s''applique.',null,'multi_choice',true,true,'Autre','Pr?cise l''outil de notes',10,'{}'::jsonb),
    ('outils_actuels','outils_projets','Quels outils g?rent tes projets ?',null,null,null,'multi_choice',true,true,'Autre','Pr?cise l''outil de gestion de projet',20,'{}'::jsonb),
    ('outils_actuels','outils_emails','Quel est ton outil principal pour les e-mails ?',null,null,null,'multi_choice',true,true,'Autre','Pr?cise le client mail',30,'{}'::jsonb),

    ('ia_automatisation','ia_outils','Quels outils d''IA utilises-tu d?j? ?',null,'S?lectionne toutes les options pertinentes.',null,'multi_choice',true,true,'Autre','Pr?cise l''outil IA',10,'{}'::jsonb),
    ('ia_automatisation','niveau_automatisation','Quel est ton niveau d''automatisation (Zapier/Make/IFTTT) ?',null,null,null,'slider',false,false,null,null,20,
      jsonb_build_object(
        'min',1,'max',5,'step',1,
        'labels',jsonb_build_object(
          '1','Pas encore',
          '2','Exp?rimentations',
          '3','Quelques sc?narios en place',
          '4','Automatisations r?guli?res',
          '5','Workflows avanc?s'
        )
      )
    ),

    ('bases_prioritaires','bases_prioritaires','Quelles bases souhaites-tu d?marrer en premier ?',null,'S?lectionne les bases indispensables.',null,'multi_choice',true,true,'Autre','Pr?cise la base ? cr?er',10,'{}'::jsonb),

    ('competences_it','experience_dev','As-tu d?j? fait du d?veloppement ?',null,null,null,'single_choice',false,false,null,null,5,'{}'::jsonb),
    ('competences_it','experience_ia','As-tu d?j? con?u ou param?tr? de l''IA (prompts, mod?les...) ?',null,null,null,'single_choice',false,false,null,null,10,'{}'::jsonb),
    ('competences_it','maitrise_excel','Ma?trises-tu Excel/Google Sheets avanc? ?',null,null,null,'single_choice',false,false,null,null,15,'{}'::jsonb),
    ('competences_it','experience_bdd','As-tu d?j? travaill? avec des bases de donn?es ?',null,null,null,'single_choice',false,false,null,null,20,'{}'::jsonb),
    ('competences_it','concepts_connus','Quels concepts connais-tu d?j? ?',null,'S?lectionne tous les concepts familiers.',null,'multi_choice',true,false,null,null,30,'{}'::jsonb),
    ('competences_it','niveau_informatique','Comment ?values-tu ton niveau informatique global ?',null,null,null,'slider',false,false,null,null,40,
      jsonb_build_object(
        'min',1,'max',5,'step',1,
        'labels',jsonb_build_object(
          '1','Je d?bute',
          '2','Je progresse',
          '3','Autonome',
          '4','Tr?s ? l''aise',
          '5','Expert'
        )
      )
    ),
    ('competences_it','commentaire_informatique','Un commentaire sur ta ma?trise informatique ?',null,'Partage un contexte ou des besoins sp?cifiques.','Ex. je veux renforcer mes bases sur les formules','text_long',false,false,null,null,50,'{}'::jsonb),

    ('contexte_materiel','metier_activite','Quel est ton m?tier ou activit? principale ?',null,null,'Ex. coach business, CEO, freelance','text_short',false,false,null,null,10,'{}'::jsonb),
    ('contexte_materiel','taille_equipe','Quelle est la taille de ton ?quipe ?',null,null,null,'single_choice',false,false,null,null,20,'{}'::jsonb),
    ('contexte_materiel','ecran_34','As-tu un ?cran 34" ? la maison ?',null,null,null,'single_choice',false,false,null,null,30,'{}'::jsonb),
    ('contexte_materiel','type_ordinateur','Quel type d''ordinateur utilises-tu ?',null,null,null,'single_choice',false,false,null,null,40,'{}'::jsonb),
    ('contexte_materiel','contraintes','Y a-t-il des contraintes particuli?res ? prendre en compte ?',null,null,'Ex. d?placements fr?quents, ?quipe ? former','text_long',false,false,null,null,50,'{}'::jsonb),

    ('attentes_pedagogiques','style_apprentissage','Quel style d''apprentissage pr?f?res-tu ?',null,null,null,'single_choice',false,false,null,null,10,'{}'::jsonb),
    ('attentes_pedagogiques','frequence','? quelle fr?quence souhaites-tu les sessions ?',null,null,null,'single_choice',false,false,null,null,20,'{}'::jsonb),
    ('attentes_pedagogiques','duree_seance','Quelle dur?e pour chaque s?ance ?',null,null,null,'single_choice',false,false,null,null,30,'{}'::jsonb)
) as q(section_slug, slug, label, description, helper_text, placeholder, type, allow_multiple, allow_other, other_label, other_placeholder, sort_order, metadata)
join public.training_onboarding_sections s on s.slug = q.section_slug
on conflict (slug) do update set
  section_id = excluded.section_id,
  label = excluded.label,
  description = excluded.description,
  helper_text = excluded.helper_text,
  placeholder = excluded.placeholder,
  type = excluded.type,
  allow_multiple = excluded.allow_multiple,
  allow_other = excluded.allow_other,
  other_label = excluded.other_label,
  other_placeholder = excluded.other_placeholder,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  is_active = true;

-- Seed options
insert into public.training_onboarding_question_options (question_id, value, label, description, sort_order, is_active)
select q.id, opt.value, opt.label, opt.description, opt.sort_order, true
from public.training_onboarding_questions q
join lateral (
  values
    ('format','presentiel','Pr?sentiel',null,10),
    ('format','visio','Visio',null,20),
    ('format','hybride','Hybride',null,30),

    ('mode_accompagnement','coaching','Je construis avec coaching',null,10),
    ('mode_accompagnement','done_for_you','Tu construis pour moi',null,20),
    ('mode_accompagnement','mixte','Mixte',null,30),

    ('livrables','template','Template',null,10),
    ('livrables','dashboard','Dashboard',null,20),
    ('livrables','bases_de_donnees','Bases de donn?es',null,30),
    ('livrables','automatisations','Automatisations (Zapier/Make)',null,40),
    ('livrables','autre','Autre',null,50),

    ('domaines_piloter','projets','Projets',null,10),
    ('domaines_piloter','taches','T?ches',null,20),
    ('domaines_piloter','crm','CRM',null,30),
    ('domaines_piloter','contacts','Personnes / Contacts',null,40),
    ('domaines_piloter','ressources_docs','Ressources / Docs',null,50),
    ('domaines_piloter','recettes','Recettes',null,60),
    ('domaines_piloter','objectifs_okr','Objectifs / OKR',null,70),
    ('domaines_piloter','vision_journal','Vision / Journal',null,80),
    ('domaines_piloter','finances_simples','Finances (simples)',null,90),
    ('domaines_piloter','suivi_formation','Suivi formation',null,100),
    ('domaines_piloter','autre','Autre',null,110),

    ('notion_experience','oui','Oui',null,10),
    ('notion_experience','non','Non',null,20),

    ('outils_notes','notion','Notion',null,10),
    ('outils_notes','evernote','Evernote',null,20),
    ('outils_notes','apple_notes','Apple Notes',null,30),
    ('outils_notes','onenote','OneNote',null,40),
    ('outils_notes','google_docs','Google Docs',null,50),
    ('outils_notes','obsidian','Obsidian',null,60),
    ('outils_notes','paper','Dropbox Paper',null,70),
    ('outils_notes','aucun','Aucun',null,80),
    ('outils_notes','autre','Autre',null,90),

    ('outils_projets','notion','Notion',null,10),
    ('outils_projets','trello','Trello',null,20),
    ('outils_projets','asana','Asana',null,30),
    ('outils_projets','clickup','ClickUp',null,40),
    ('outils_projets','jira','Jira',null,50),
    ('outils_projets','sheets_excel','Sheets / Excel',null,60),
    ('outils_projets','aucun','Aucun',null,70),
    ('outils_projets','autre','Autre',null,80),

    ('outils_emails','gmail','Gmail',null,10),
    ('outils_emails','outlook','Outlook',null,20),
    ('outils_emails','proton','Proton',null,30),
    ('outils_emails','apple_mail','Apple Mail',null,40),
    ('outils_emails','thunderbird','Thunderbird',null,50),
    ('outils_emails','autre','Autre',null,60),

    ('ia_outils','chatgpt','ChatGPT',null,10),
    ('ia_outils','claude','Claude',null,20),
    ('ia_outils','ide_ia','IDE avec IA (Copilot, Codeium...)',null,30),
    ('ia_outils','agents','Agents / Automations',null,40),
    ('ia_outils','aucune','Aucune',null,50),
    ('ia_outils','autre','Autre',null,60),

    ('bases_prioritaires','projets','Projets',null,10),
    ('bases_prioritaires','taches','T?ches',null,20),
    ('bases_prioritaires','personnes','Personnes / Contacts',null,30),
    ('bases_prioritaires','entreprises','Entreprises',null,40),
    ('bases_prioritaires','ressources_docs','Ressources / Docs',null,50),
    ('bases_prioritaires','contenu_notes','Contenu / Notes',null,60),
    ('bases_prioritaires','recettes','Recettes',null,70),
    ('bases_prioritaires','produits_inventaire','Produits / Inventaire',null,80),
    ('bases_prioritaires','habitudes','Habitudes',null,90),
    ('bases_prioritaires','calendrier_echeances','Calendrier d''?ch?ances',null,100),
    ('bases_prioritaires','autre','Autre',null,110),

    ('experience_dev','oui','Oui',null,10),
    ('experience_dev','non','Non',null,20),

    ('experience_ia','oui','Oui',null,10),
    ('experience_ia','non','Non',null,20),

    ('maitrise_excel','oui','Oui',null,10),
    ('maitrise_excel','non','Non',null,20),

    ('experience_bdd','oui','Oui',null,10),
    ('experience_bdd','non','Non',null,20),

    ('concepts_connus','base_de_donnees','Base de donn?es',null,10),
    ('concepts_connus','table','Table',null,20),
    ('concepts_connus','cle_primaire','Cl? primaire',null,30),
    ('concepts_connus','relation','Relation',null,40),
    ('concepts_connus','filtre_tri','Filtre / Tri',null,50),
    ('concepts_connus','formule','Formule',null,60),
    ('concepts_connus','schema','Sch?ma',null,70),
    ('concepts_connus','aucun','Aucun',null,80),

    ('taille_equipe','solo','Solo',null,10),
    ('taille_equipe','deux_cinq','2 ? 5 personnes',null,20),
    ('taille_equipe','plus_cinq','Plus de 5',null,30),

    ('ecran_34','oui','Oui',null,10),
    ('ecran_34','non','Non',null,20),
    ('ecran_34','je_ne_sais_pas','Je ne sais pas',null,30),

    ('type_ordinateur','portable','Portable',null,10),
    ('type_ordinateur','fixe','Fixe',null,20),
    ('type_ordinateur','les_deux','Les deux',null,30),

    ('style_apprentissage','demonstration','D?monstration',null,10),
    ('style_apprentissage','pratique_guidee','Pratique guid?e',null,20),
    ('style_apprentissage','autonomie_assistee','Autonomie assist?e',null,30),

    ('frequence','ponctuel','Ponctuel',null,10),
    ('frequence','hebdo','Hebdo',null,20),
    ('frequence','bimensuel','Bimensuel',null,30),
    ('frequence','mensuel','Mensuel',null,40),

    ('duree_seance','30','30 min',null,10),
    ('duree_seance','60','60 min',null,20),
    ('duree_seance','90','90 min',null,30)
) as opt(question_slug, value, label, description, sort_order)
on q.slug = opt.question_slug
on conflict (question_id, value) do update set
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- Register permission for client module
insert into public.role_permissions (permission, description, client, vip, admin, prof, guest, family, display_order)
values ('training_preferences:view_module', 'Acc?s au module Pr?f?rences de formation', true, true, true, true, false, 'dashboard', 95)
on conflict (permission) do update set
  description = excluded.description,
  client = excluded.client,
  vip = excluded.vip,
  admin = excluded.admin,
  prof = excluded.prof,
  family = coalesce(excluded.family, role_permissions.family),
  display_order = coalesce(excluded.display_order, role_permissions.display_order);

-- Register client dashboard module
insert into public.modules_registry (module_key, name, description, required_permission, is_active, default_layout)
values ('client_training_preferences', 'Pr?f?rences de formation', 'R?sum? du brief d''onboarding et acc?s rapide ? la mise ? jour.', 'training_preferences:view_module', true, '{"span":12}'::jsonb)
on conflict (module_key) do update set
  name = excluded.name,
  description = excluded.description,
  required_permission = excluded.required_permission,
  is_active = excluded.is_active,
  default_layout = excluded.default_layout;

-- Register admin module entry
insert into public.admin_modules_registry (module_key, tab_id, component_name, label, description, icon, display_order, is_active, updated_at)
values ('training_onboarding_questions_admin', 'user_submissions', 'OnboardingQuestionsAdminPanel', 'Formulaire d''onboarding', 'G?re les questions du formulaire d''onboarding formation.', 'ListChecks', 2, true, now())
on conflict (module_key) do update set
  tab_id = excluded.tab_id,
  component_name = excluded.component_name,
  label = excluded.label,
  description = excluded.description,
  icon = excluded.icon,
  display_order = excluded.display_order,
  is_active = excluded.is_active,
  updated_at = now();
