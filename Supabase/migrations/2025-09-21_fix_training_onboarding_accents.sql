-- Migration: Fix accents for Onboarding Training Form
-- Date: 2025-09-21
-- Scope: Fix French accents and diacritics for titles, labels, helper texts, placeholders, option labels,
--        and slider metadata labels in onboarding tables. No schema change.

BEGIN;

-- Sections: titles & descriptions
UPDATE public.training_onboarding_sections
SET description = 'Choisis le format de la formation et l''accompagnement souhaité.'
WHERE slug = 'format_mode';

UPDATE public.training_onboarding_sections
SET description = 'Définis les résultats attendus de la formation.'
WHERE slug = 'objectifs_livrables';

UPDATE public.training_onboarding_sections
SET title = 'Domaines à piloter',
    description = 'Liste les espaces Notion à cadrer en priorité.'
WHERE slug = 'domaines';

UPDATE public.training_onboarding_sections
SET description = 'Situe ton niveau actuel sur les briques clés de Notion.'
WHERE slug = 'niveau_notion';

-- outils_actuels: already correct
-- ia_automatisation: already correct

UPDATE public.training_onboarding_sections
SET title = 'Bases à démarrer',
    description = 'Les bases Notion à lancer en premier.'
WHERE slug = 'bases_prioritaires';

UPDATE public.training_onboarding_sections
SET title = 'Compétences IT',
    description = 'Ton aisance informatique globale.'
WHERE slug = 'competences_it';

UPDATE public.training_onboarding_sections
SET title = 'Contexte & matériel'
WHERE slug = 'contexte_materiel';

UPDATE public.training_onboarding_sections
SET title = 'Attentes pédagogiques',
    description = 'Cadre tes attentes pour les séances.'
WHERE slug = 'attentes_pedagogiques';

-- Questions: labels, helper_text, placeholders
UPDATE public.training_onboarding_questions
SET label = 'Quel format de séance préfères-tu ?',
    helper_text = 'Tu peux cocher plusieurs formats.'
WHERE slug = 'format';

UPDATE public.training_onboarding_questions
SET label = 'Quel mode de collaboration t''intéresse ?'
WHERE slug = 'mode_accompagnement';

UPDATE public.training_onboarding_questions
SET label = 'Quelles sont tes disponibilités habituelles ?',
    helper_text = 'Indique les créneaux ou jours qui t''arrangent.',
    placeholder = 'Ex. lundi matin, jeudi après-midi'
WHERE slug = 'disponibilites';

UPDATE public.training_onboarding_questions
SET label = 'Quel est ton objectif principal ?'
WHERE slug = 'objectif_principal';

UPDATE public.training_onboarding_questions
SET label = 'Quels livrables souhaites-tu obtenir ?',
    helper_text = 'Sélectionne tous les livrables utiles.',
    other_placeholder = 'Précise les livrables attendus'
WHERE slug = 'livrables';

UPDATE public.training_onboarding_questions
SET label = 'Quels domaines veux-tu piloter dans Notion ?',
    helper_text = 'Sélectionne toutes les zones concernées.',
    other_placeholder = 'Précise le domaine à couvrir'
WHERE slug = 'domaines_piloter';

UPDATE public.training_onboarding_questions
SET label = 'As-tu déjà utilisé Notion ?'
WHERE slug = 'notion_experience';

UPDATE public.training_onboarding_questions
SET label = 'Niveau général Notion',
    helper_text = 'Glisse le curseur pour situer ton niveau.'
WHERE slug = 'notion_niveau_global';

UPDATE public.training_onboarding_questions
SET label = 'Niveau sur les bases de données'
WHERE slug = 'notion_niveau_bdd';

UPDATE public.training_onboarding_questions
SET label = 'Niveau sur les formules'
WHERE slug = 'notion_niveau_formules';

UPDATE public.training_onboarding_questions
SET label = 'Niveau sur les relations et liaisons'
WHERE slug = 'notion_niveau_relations';

UPDATE public.training_onboarding_questions
SET label = 'Quels outils utilises-tu pour tes notes ?',
    helper_text = 'Sélectionne tout ce qui s''applique.',
    other_placeholder = 'Précise l''outil de notes'
WHERE slug = 'outils_notes';

UPDATE public.training_onboarding_questions
SET label = 'Quels outils gèrent tes projets ?',
    other_placeholder = 'Précise l''outil de gestion de projet'
WHERE slug = 'outils_projets';

UPDATE public.training_onboarding_questions
SET label = 'Quel est ton outil principal pour les e-mails ?'
WHERE slug = 'outils_emails';

UPDATE public.training_onboarding_questions
SET label = 'Quels outils d''IA utilises-tu déjà ?',
    helper_text = 'Sélectionne toutes les options pertinentes.',
    other_placeholder = 'Précise l''outil IA'
WHERE slug = 'ia_outils';

UPDATE public.training_onboarding_questions
SET label = 'Quel est ton niveau d''automatisation (Zapier/Make/IFTTT) ?'
WHERE slug = 'niveau_automatisation';

UPDATE public.training_onboarding_questions
SET label = 'Quelles bases souhaites-tu démarrer en premier ?',
    helper_text = 'Sélectionne les bases indispensables.',
    other_placeholder = 'Précise la base à créer'
WHERE slug = 'bases_prioritaires';

UPDATE public.training_onboarding_questions
SET label = 'As-tu déjà fait du développement ?'
WHERE slug = 'experience_dev';

UPDATE public.training_onboarding_questions
SET label = 'As-tu déjà conçu ou paramétré de l''IA (prompts, modèles...) ?'
WHERE slug = 'experience_ia';

UPDATE public.training_onboarding_questions
SET label = 'Maîtrises-tu Excel/Google Sheets avancé ?'
WHERE slug = 'maitrise_excel';

UPDATE public.training_onboarding_questions
SET label = 'As-tu déjà travaillé avec des bases de données ?'
WHERE slug = 'experience_bdd';

UPDATE public.training_onboarding_questions
SET label = 'Quels concepts connais-tu déjà ?',
    helper_text = 'Sélectionne tous les concepts familiers.'
WHERE slug = 'concepts_connus';

UPDATE public.training_onboarding_questions
SET label = 'Comment évalues-tu ton niveau informatique global ?'
WHERE slug = 'niveau_informatique';

UPDATE public.training_onboarding_questions
SET label = 'Un commentaire sur ta maîtrise informatique ?',
    helper_text = 'Partage un contexte ou des besoins spécifiques.'
WHERE slug = 'commentaire_informatique';

UPDATE public.training_onboarding_questions
SET label = 'Quel est ton métier ou activité principale ?'
WHERE slug = 'metier_activite';

UPDATE public.training_onboarding_questions
SET label = 'Quelle est la taille de ton équipe ?'
WHERE slug = 'taille_equipe';

UPDATE public.training_onboarding_questions
SET label = 'As-tu un écran 34" à la maison ?'
WHERE slug = 'ecran_34';

UPDATE public.training_onboarding_questions
SET label = 'Quel type d''ordinateur utilises-tu ?'
WHERE slug = 'type_ordinateur';

UPDATE public.training_onboarding_questions
SET label = 'Y a-t-il des contraintes particulières à prendre en compte ?'
WHERE slug = 'contraintes';

UPDATE public.training_onboarding_questions
SET label = 'Quel style d''apprentissage préfères-tu ?'
WHERE slug = 'style_apprentissage';

UPDATE public.training_onboarding_questions
SET label = 'À quelle fréquence souhaites-tu les sessions ?'
WHERE slug = 'frequence';

UPDATE public.training_onboarding_questions
SET label = 'Quelle durée pour chaque séance ?'
WHERE slug = 'duree_seance';

-- Slider metadata labels: Notion levels (4 questions share same labels)
UPDATE public.training_onboarding_questions
SET metadata = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(coalesce(metadata, '{}'::jsonb), '{labels,1}', to_jsonb('Découverte'::text)),
        '{labels,2}', to_jsonb('Débutant'::text)
      ),
      '{labels,3}', to_jsonb('Intermédiaire autonome'::text)
    ),
    '{labels,4}', to_jsonb('Avancé (compose des bases)'::text)
  ),
  '{labels,5}', to_jsonb('Expert (conçoit seul)'::text)
)
WHERE slug IN (
  'notion_niveau_global',
  'notion_niveau_bdd',
  'notion_niveau_formules',
  'notion_niveau_relations'
);

-- Slider metadata labels: niveau_automatisation
UPDATE public.training_onboarding_questions
SET metadata = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(coalesce(metadata, '{}'::jsonb), '{labels,1}', to_jsonb('Pas encore'::text)),
        '{labels,2}', to_jsonb('Expérimentations'::text)
      ),
      '{labels,3}', to_jsonb('Quelques scénarios en place'::text)
    ),
    '{labels,4}', to_jsonb('Automatisations régulières'::text)
  ),
  '{labels,5}', to_jsonb('Workflows avancés'::text)
)
WHERE slug = 'niveau_automatisation';

-- Slider metadata labels: niveau_informatique
UPDATE public.training_onboarding_questions
SET metadata = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(coalesce(metadata, '{}'::jsonb), '{labels,1}', to_jsonb('Je débute'::text)),
        '{labels,2}', to_jsonb('Je progresse'::text)
      ),
      '{labels,3}', to_jsonb('Autonome'::text)
    ),
    '{labels,4}', to_jsonb('Très à l''aise'::text)
  ),
  '{labels,5}', to_jsonb('Expert'::text)
)
WHERE slug = 'niveau_informatique';

-- Option labels fixes using (question_slug, value)
WITH mapping(question_slug, value, new_label) AS (
  VALUES
    -- format
    ('format','presentiel','Présentiel'),
    ('format','visio','Visio'),
    ('format','hybride','Hybride'),

    -- livrables
    ('livrables','bases_de_donnees','Bases de données'),
    ('livrables','automatisations','Automatisations (Zapier/Make)'),

    -- domaines_piloter
    ('domaines_piloter','taches','Tâches'),

    -- niveau_notion (oui/non already correct)

    -- outils_notes (labels ok; keep for completeness)

    -- outils_projets (labels ok)

    -- outils_emails (labels ok)

    -- ia_outils (labels ok)

    -- bases_prioritaires
    ('bases_prioritaires','taches','Tâches'),
    ('bases_prioritaires','calendrier_echeances','Calendrier d’échéances'),

    -- concepts_connus
    ('concepts_connus','base_de_donnees','Base de données'),
    ('concepts_connus','cle_primaire','Clé primaire'),
    ('concepts_connus','schema','Schéma'),

    -- taille_equipe
    ('taille_equipe','deux_cinq','2 à 5 personnes'),

    -- style_apprentissage
    ('style_apprentissage','demonstration','Démonstration'),
    ('style_apprentissage','pratique_guidee','Pratique guidée'),
    ('style_apprentissage','autonomie_assistee','Autonomie assistée')
)
UPDATE public.training_onboarding_question_options o
SET label = m.new_label
FROM mapping m, public.training_onboarding_questions q
WHERE q.id = o.question_id
  AND q.slug = m.question_slug
  AND o.value = m.value;

COMMIT;
