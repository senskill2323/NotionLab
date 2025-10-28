-- Seed initial notification events and attach existing e-mail templates.
-- This script is idempotent: it can be re-run safely.

WITH upserted_events AS (
  INSERT INTO public.notification_events (event_key, label, description, is_active)
  VALUES
    (
      'auth.signup',
      'Inscription confirmée',
      'Déclenchée lorsque Supabase Auth envoie un e-mail de confirmation d’inscription.',
      TRUE
    ),
    (
      'auth.invite',
      'Invitation utilisateur',
      'Invitation initiale envoyée lorsqu’un membre est convié sur la plateforme.',
      TRUE
    ),
    (
      'auth.magic_link',
      'Connexion par magic link',
      'Lien de connexion instantanée généré par Supabase Auth.',
      TRUE
    ),
    (
      'auth.password_recovery',
      'Réinitialisation mot de passe',
      'Envoi d’un lien de récupération ou réinitialisation de mot de passe.',
      TRUE
    ),
    (
      'auth.email_change',
      'Confirmation changement d’e-mail',
      'Validation d’une nouvelle adresse e-mail pour un compte existant.',
      TRUE
    ),
    (
      'auth.reauthentication',
      'Réauthentification sécurisée',
      'Demande de vérification additionnelle (actions sensibles, token secondaire).',
      TRUE
    ),
    (
      'user.account.activated',
      'Activation d’un compte utilisateur',
      'Notification interne pour confirmer l’activation d’un utilisateur.',
      TRUE
    ),
    (
      'owner.user.created',
      'Notification propriétaire nouveau compte',
      'Notification d’alerte envoyée au propriétaire lors d’une nouvelle inscription.',
      TRUE
    )
  ON CONFLICT (event_key) DO UPDATE
  SET
    label       = EXCLUDED.label,
    description = EXCLUDED.description,
    is_active   = TRUE,
    updated_at  = timezone('utc', now())
  RETURNING id, event_key
),
event_template_mappings AS (
  SELECT
    ue.id AS event_id,
    mapping.notification_key,
    mapping.is_primary,
    mapping.priority
  FROM upserted_events ue
  JOIN (VALUES
    ('auth.signup', 'signup', TRUE, 0),
    ('auth.invite', 'invite', TRUE, 0),
    ('auth.magic_link', 'magiclink', TRUE, 0),
    ('auth.password_recovery', 'recovery', TRUE, 0),
    ('auth.email_change', 'email_change', TRUE, 0),
    ('auth.reauthentication', 'reauthentication', TRUE, 0)
  ) AS mapping(event_key, notification_key, is_primary, priority)
    ON mapping.event_key = ue.event_key
)
INSERT INTO public.notification_event_templates (event_id, notification_id, is_primary, priority)
SELECT
  etm.event_id,
  en.id,
  etm.is_primary,
  etm.priority
FROM event_template_mappings etm
JOIN public.email_notifications en
  ON en.notification_key = etm.notification_key
ON CONFLICT (event_id, notification_id) DO UPDATE
SET
  is_primary = EXCLUDED.is_primary,
  priority   = EXCLUDED.priority,
  updated_at = timezone('utc', now());
