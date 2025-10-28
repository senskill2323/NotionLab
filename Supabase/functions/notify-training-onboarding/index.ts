import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from './cors.ts';
import {
  requireAuth,
  handleHttpError,
  HttpError,
} from "../_shared/auth.ts";
import {
  getSmtpConfig,
  sanitizeEmail,
  sendSmtpMail,
} from "../_shared/email.ts";
const SMTP_DEFAULTS = getSmtpConfig({ required: false });
const TARGET_EMAIL = sanitizeEmail(
  Deno.env.get('ONBOARDING_NOTIFICATION_EMAIL') ??
    Deno.env.get('OWNER_EMAIL'),
) ?? sanitizeEmail(SMTP_DEFAULTS?.senderEmail) ?? 'yann@bluewin.ch';
const FROM_EMAIL = sanitizeEmail(Deno.env.get('ONBOARDING_EMAIL_FROM')) ??
  sanitizeEmail(Deno.env.get('SENDER_EMAIL')) ??
  sanitizeEmail(SMTP_DEFAULTS?.senderEmail) ?? TARGET_EMAIL;
const FROM_NAME = Deno.env.get('ONBOARDING_EMAIL_SENDER_NAME') ??
  SMTP_DEFAULTS?.senderName ?? 'NotionLab';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const auth = await requireAuth(req, { allowedRoles: ["owner", "admin"] });
    const body = await req.json().catch(() => {
      throw new HttpError(400, "Invalid JSON payload");
    });
    const {
      userId,
      userName,
      userEmail,
      isFirstSubmission,
      summary,
    } = body ?? {};

    if (!userId || typeof userId !== "string") {
      throw new HttpError(400, "userId is required");
    }

    const displayName = userName || userEmail || 'Client';
    const subject = isFirstSubmission
      ? `Nouveau brief d’onboarding NotionLab – ${displayName}`
      : `Brief d’onboarding mis à jour – ${displayName}`;

    const textSummary = typeof summary === 'string' && summary.trim().length > 0
      ? summary
      : 'Le client a soumis ou mis à jour le formulaire d’onboarding formation.';


    await sendSmtpMail({
      recipients: [TARGET_EMAIL],
      subject,
      textBody: textSummary,
      htmlBody: `<p>${textSummary}</p>`,
      senderEmail: FROM_EMAIL,
      senderName: FROM_NAME,
    });

    return new Response(JSON.stringify({ success: true, requestedBy: auth.user.id }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return handleHttpError(error, corsHeaders);
  }
});
