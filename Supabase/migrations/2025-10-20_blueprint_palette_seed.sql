BEGIN;

WITH families AS (
  INSERT INTO public.blueprint_palette_families (label, description, sort_order)
  VALUES
    ('Bases de données', 'Gabarits de bases Notion prêtes à être reliées aux pages.', 10),
    ('Processus internes', 'Modèles pour structurer et suivre les opérations quotidiennes.', 20),
    ('Communication', 'Blueprints pour organiser les contenus et échanges clients.', 30)
  RETURNING id, label
)
INSERT INTO public.blueprint_palette_items (family_id, label, description, sort_order)
SELECT f.id, payload.item_label, payload.item_description, payload.sort_order
FROM families f
JOIN (
  VALUES
    ('Bases de données', 'Base Tâches', 'Base de données qui regroupe les tâches et leurs responsables.', 10),
    ('Bases de données', 'Base Clients', 'Référentiel des comptes clients avec statut et dernier échange.', 20),
    ('Processus internes', 'Checklist Onboarding', 'Checklist pour onboarder un nouveau client étape par étape.', 10),
    ('Processus internes', 'Suivi Qualité', 'Table simplifiée pour tracer les contrôles qualité récurrents.', 20),
    ('Communication', 'Plan Editorial', 'Planning éditorial multi-canaux avec statut et propriétaire.', 10),
    ('Communication', 'Brief Newsletter', 'Fiche récapitulant objectif, audience et contenus d’une newsletter.', 20)
) AS payload(family_label, item_label, item_description, sort_order)
ON f.label = payload.family_label;

COMMIT;