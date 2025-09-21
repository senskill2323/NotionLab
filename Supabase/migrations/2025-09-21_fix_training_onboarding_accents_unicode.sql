-- Migration: Fix accents using Unicode escapes (safe across clients)
-- Date: 2025-09-21
-- Scope: Re-apply French labels with U&'...'

BEGIN;

-- Sliders: Notion levels (4 questions)
UPDATE public.training_onboarding_questions
SET metadata = coalesce(metadata, '{}'::jsonb)
  || jsonb_build_object(
       'labels', jsonb_build_object(
         '1', U&'D\00E9couverte',
         '2', U&'D\00E9butant',
         '3', U&'Interm\00E9diaire autonome',
         '4', U&'Avanc\00E9 (compose des bases)',
         '5', U&'Expert (con\00E7oit seul)'
       )
     )
WHERE slug IN ('notion_niveau_global','notion_niveau_bdd','notion_niveau_formules','notion_niveau_relations');

-- Slider: niveau_automatisation
UPDATE public.training_onboarding_questions
SET metadata = coalesce(metadata, '{}'::jsonb)
  || jsonb_build_object(
       'labels', jsonb_build_object(
         '1', U&'Pas encore',
         '2', U&'Exp\00E9rimentations',
         '3', U&'Quelques sc\00E9narios en place',
         '4', U&'Automatisations r\00E9guli\00E8res',
         '5', U&'Workflows avanc\00E9s'
       )
     )
WHERE slug = 'niveau_automatisation';

-- Slider: niveau_informatique
UPDATE public.training_onboarding_questions
SET metadata = coalesce(metadata, '{}'::jsonb)
  || jsonb_build_object(
       'labels', jsonb_build_object(
         '1', U&'Je d\00E9bute',
         '2', U&'Je progresse',
         '3', U&'Autonome',
         '4', U&'Tr\00E8s \00E0 l''aise',
         '5', U&'Expert'
       )
     )
WHERE slug = 'niveau_informatique';

-- Options mapping with safe Unicode literals
WITH mapping(question_slug, value, new_label) AS (
  VALUES
    -- format
    ('format','presentiel',U&'Pr\00E9sentiel'),
    ('format','visio',U&'Visio'),
    ('format','hybride',U&'Hybride'),

    -- livrables
    ('livrables','bases_de_donnees',U&'Bases de donn\00E9es'),
    ('livrables','automatisations',U&'Automatisations (Zapier/Make)'),

    -- domaines_piloter
    ('domaines_piloter','taches',U&'T\00E2ches'),

    -- bases_prioritaires
    ('bases_prioritaires','taches',U&'T\00E2ches'),
    ('bases_prioritaires','calendrier_echeances',U&'Calendrier d''\00E9ch\00E9ances'),

    -- concepts_connus
    ('concepts_connus','base_de_donnees',U&'Base de donn\00E9es'),
    ('concepts_connus','cle_primaire',U&'Cl\00E9 primaire'),
    ('concepts_connus','schema',U&'Sch\00E9ma'),

    -- taille_equipe
    ('taille_equipe','deux_cinq',U&'2 \00E0 5 personnes'),

    -- style_apprentissage
    ('style_apprentissage','demonstration',U&'D\00E9monstration'),
    ('style_apprentissage','pratique_guidee',U&'Pratique guid\00E9e'),
    ('style_apprentissage','autonomie_assistee',U&'Autonomie assist\00E9e')
)
UPDATE public.training_onboarding_question_options o
SET label = m.new_label
FROM mapping m, public.training_onboarding_questions q
WHERE q.id = o.question_id
  AND q.slug = m.question_slug
  AND o.value = m.value;

COMMIT;
