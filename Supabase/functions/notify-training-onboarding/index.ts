import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend@3.4.0';
import { corsHeaders } from './cors.ts';

const TARGET_EMAIL = Deno.env.get('ONBOARDING_NOTIFICATION_EMAIL')
  ?? Deno.env.get('OWNER_EMAIL')
  ?? 'yann@bluewin.ch';
const FROM_EMAIL = Deno.env.get('ONBOARDING_EMAIL_FROM')
  ?? Deno.env.get('SENDER_EMAIL')
  ?? 'notifications@notionlab.co';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      userId,
      userName,
      userEmail,
      isFirstSubmission,
      summary,
    } = body ?? {};

    if (!userId) {
      throw new Error('userId is required');
    }

    const displayName = userName || userEmail || 'Client';
    const subject = isFirstSubmission
      ? `Nouveau brief d’onboarding NotionLab – ${displayName}`
      : `Brief d’onboarding mis à jour – ${displayName}`;

    const textSummary = typeof summary === 'string' && summary.trim().length > 0
      ? summary
      : 'Le client a soumis ou mis à jour le formulaire d’onboarding formation.';


    if (!resend) {
      console.log('[notify-training-onboarding] RESEND_API_KEY not set. Logging only.', {
        to: TARGET_EMAIL,
        from: FROM_EMAIL,
        subject,
        text: textSummary,
      });
      return new Response(JSON.stringify({ ok: true, delivered: false }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TARGET_EMAIL],
      subject,
      text: textSummary,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message || String(error)}`);
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message ?? String(error) }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
