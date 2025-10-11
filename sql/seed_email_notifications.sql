-- Seed des notifications e-mail par défaut pour Supabase Auth
-- Chaque notification est "upsertée" afin de pouvoir relancer le script sans dupliquer les entrées.

WITH presets AS (
  SELECT *
  FROM (
    VALUES
      (
        'signup',
        'Confirme ton inscription',
        'Bienvenue chez NotionLab',
        'Active ton espace NotionLab en un clic.',
        $$<html>
  <body style="font-family: Arial, sans-serif; color:#1F2937; line-height:1.6; margin:0; padding:0; background:#F9FAFB;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F9FAFB; padding:32px 0;">
      <tr>
        <td align="center">
          <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF; border-radius:12px; padding:32px;">
            <tr>
              <td style="font-size:18px; font-weight:600; color:#111827;">Salut,</td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                Merci de rejoindre NotionLab. Clique sur le bouton ci-dessous pour confirmer ton inscription et accéder à ton espace.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 0;">
                <a href="{{confirmation_url}}" style="display:inline-block; background:#111827; color:#FFFFFF; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600;">
                  Je confirme mon inscription
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding-top:8px; color:#6B7280;">
                Code alternatif : <strong style="letter-spacing:2px;">{{token}}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding-top:32px;">
                À tout de suite,<br/>
                <strong>L’équipe NotionLab</strong>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>$$,
        'Notification envoyée lors de l’inscription.'
      ),
      (
        'invite',
        'Invitation NotionLab',
        'Tu es invité·e sur NotionLab',
        'Accepte l’invitation pour rejoindre ton espace.',
        $$<html>
  <body style="font-family: Arial, sans-serif; color:#1F2937; line-height:1.6; margin:0; padding:0; background:#F9FAFB;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F9FAFB; padding:32px 0;">
      <tr>
        <td align="center">
          <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF; border-radius:12px; padding:32px;">
            <tr>
              <td style="font-size:18px; font-weight:600; color:#111827;">Salut,</td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                Tu as été invité·e à collaborer sur NotionLab. Accepte l’invitation pour découvrir les ressources partagées avec toi.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 0;">
                <a href="{{confirmation_url}}" style="display:inline-block; background:#111827; color:#FFFFFF; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600;">
                  J’accepte l’invitation
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding-top:8px; color:#6B7280;">
                Code d’accès : <strong style="letter-spacing:2px;">{{token}}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding-top:32px;">
                À très vite sur la plateforme,<br/>
                <strong>L’équipe NotionLab</strong>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>$$,
        'Invitation pour rejoindre un espace ou une organisation.'
      ),
      (
        'magiclink',
        'Connexion instantanée',
        'Ton lien de connexion NotionLab',
        'Connecte-toi immédiatement à ton espace.',
        $$<html>
  <body style="font-family: Arial, sans-serif; color:#1F2937; line-height:1.6; margin:0; padding:0; background:#F9FAFB;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F9FAFB; padding:32px 0;">
      <tr>
        <td align="center">
          <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF; border-radius:12px; padding:32px;">
            <tr>
              <td style="font-size:18px; font-weight:600; color:#111827;">Coucou,</td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                Tu peux te connecter à NotionLab en un clic. Utilise le bouton ci-dessous ou copie le code si tu préfères.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 0;">
                <a href="{{confirmation_url}}" style="display:inline-block; background:#111827; color:#FFFFFF; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600;">
                  Ouvrir mon espace
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding-top:8px; color:#6B7280;">
                Code de connexion : <strong style="letter-spacing:2px;">{{token}}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding-top:32px;">
                À tout de suite,<br/>
                <strong>L’équipe NotionLab</strong>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>$$,
        'Lien magique pour une connexion sans mot de passe.'
      ),
      (
        'magic_link',
        'Connexion instantanée',
        'Ton lien de connexion NotionLab',
        'Connecte-toi immédiatement à ton espace.',
        $$<html>
  <body style="font-family: Arial, sans-serif; color:#1F2937; line-height:1.6; margin:0; padding:0; background:#F9FAFB;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F9FAFB; padding:32px 0;">
      <tr>
        <td align="center">
          <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF; border-radius:12px; padding:32px;">
            <tr>
              <td style="font-size:18px; font-weight:600; color:#111827;">Coucou,</td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                Tu peux te connecter à NotionLab en un clic. Utilise le bouton ci-dessous ou copie le code si tu préfères.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 0;">
                <a href="{{confirmation_url}}" style="display:inline-block; background:#111827; color:#FFFFFF; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600;">
                  Ouvrir mon espace
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding-top:8px; color:#6B7280;">
                Code de connexion : <strong style="letter-spacing:2px;">{{token}}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding-top:32px;">
                À tout de suite,<br/>
                <strong>L’équipe NotionLab</strong>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>$$,
        'Alias du lien magique (compatibilité Supabase).'
      ),
      (
        'recovery',
        'Réinitialise ton mot de passe',
        'Réinitialise ton mot de passe NotionLab',
        'Choisis un nouveau mot de passe pour sécuriser ton compte.',
        $$<html>
  <body style="font-family: Arial, sans-serif; color:#1F2937; line-height:1.6; margin:0; padding:0; background:#F9FAFB;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F9FAFB; padding:32px 0;">
      <tr>
        <td align="center">
          <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF; border-radius:12px; padding:32px;">
            <tr>
              <td style="font-size:18px; font-weight:600; color:#111827;">Salut,</td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                Tu as demandé à réinitialiser ton mot de passe. Clique sur le bouton pour choisir un nouveau mot de passe sécurisé.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 0;">
                <a href="{{confirmation_url}}" style="display:inline-block; background:#111827; color:#FFFFFF; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600;">
                  Réinitialiser mon mot de passe
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding-top:8px; color:#6B7280;">
                Code à saisir : <strong style="letter-spacing:2px;">{{token}}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding-top:32px;">
                En cas de doute, réponds simplement à cet e-mail.<br/>
                <strong>L’équipe NotionLab</strong>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>$$,
        'Mot de passe oublié ou réinitialisation initiée par l’utilisateur.'
      ),
      (
        'email_change',
        'Confirme ton nouvel email',
        'Confirme ton nouveau courriel',
        'Valide ton changement d’adresse e-mail.',
        $$<html>
  <body style="font-family: Arial, sans-serif; color:#1F2937; line-height:1.6; margin:0; padding:0; background:#F9FAFB;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F9FAFB; padding:32px 0;">
      <tr>
        <td align="center">
          <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF; border-radius:12px; padding:32px;">
            <tr>
              <td style="font-size:18px; font-weight:600; color:#111827;">Salut,</td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                Tu viens de demander un changement d’adresse e-mail. Confirme l’opération pour utiliser ta nouvelle adresse sur NotionLab.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 0;">
                <a href="{{confirmation_url}}" style="display:inline-block; background:#111827; color:#FFFFFF; padding:14px 28px; border-radius:8px; text-decoration:none; font-weight:600;">
                  Valider la nouvelle adresse
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding-top:8px; color:#6B7280;">
                Code confirmation : <strong style="letter-spacing:2px;">{{token}}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding-top:32px;">
                Merci de maintenir ton profil à jour,<br/>
                <strong>L’équipe NotionLab</strong>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>$$,
        'Validation d’une nouvelle adresse e-mail (mode sécurisé).'
      ),
      (
        'reauthentication',
        'Réauthentifie-toi en un instant',
        'Confirme que c’est bien toi',
        'Ton code de vérification pour sécuriser ton action.',
        $$<html>
  <body style="font-family: Arial, sans-serif; color:#1F2937; line-height:1.6; margin:0; padding:0; background:#F9FAFB;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F9FAFB; padding:32px 0;">
      <tr>
        <td align="center">
          <table width="520" cellpadding="0" cellspacing="0" role="presentation" style="background:#FFFFFF; border-radius:12px; padding:32px;">
            <tr>
              <td style="font-size:18px; font-weight:600; color:#111827;">Salut,</td>
            </tr>
            <tr>
              <td style="padding-top:12px;">
                Pour finaliser cette action sensible, confirme simplement que c’est bien toi en saisissant le code ci-dessous.
              </td>
            </tr>
            <tr>
              <td style="padding-top:18px; text-align:center; color:#111827; font-size:26px; letter-spacing:6px;">
                <strong>{{token}}</strong>
              </td>
            </tr>
            <tr>
              <td style="padding-top:18px;">
                Si tu n’es pas à l’origine de cette demande, contacte-nous sans attendre.
              </td>
            </tr>
            <tr>
              <td style="padding-top:32px;">
                Merci de protéger ton compte,<br/>
                <strong>L’équipe NotionLab</strong>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>$$,
        'Réauthentification requise (changement sensible, suppression de compte, etc.).'
      )
  ) AS t(notification_key, title, subject, preview_text, body_html, description)
)
INSERT INTO public.email_notifications (
  notification_key,
  title,
  subject,
  preview_text,
  body_html,
  description,
  sender_name,
  sender_email,
  force_send,
  is_active,
  default_enabled
)
SELECT
  notification_key,
  title,
  subject,
  preview_text,
  body_html,
  description,
  'NotionLab',
  'notifications@notionlab.co',
  false,
  true,
  true
FROM presets
ON CONFLICT (notification_key) DO UPDATE
SET
  title = EXCLUDED.title,
  subject = EXCLUDED.subject,
  preview_text = EXCLUDED.preview_text,
  body_html = EXCLUDED.body_html,
  description = EXCLUDED.description,
  sender_name = EXCLUDED.sender_name,
  sender_email = EXCLUDED.sender_email,
  force_send = EXCLUDED.force_send,
  is_active = EXCLUDED.is_active,
  default_enabled = EXCLUDED.default_enabled,
  updated_at = now();
