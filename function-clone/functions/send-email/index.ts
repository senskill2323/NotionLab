import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { Webhook } from "https://esm.sh/svix@1.16.0?target=deno&bundle";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";
import { HttpError } from "../_shared/auth.ts";
import {
  getSmtpConfig,
  sanitizeEmail,
  sendSmtpMail,
} from "../_shared/email.ts";

type EmailNotification = {
  notification_key: string;
  title: string | null;
  subject: string | null;
  preview_text: string | null;
  body_html: string | null;
  sender_name: string | null;
  sender_email: string | null;
  force_send: boolean | null;
  is_active: boolean | null;
};

type SendEmailHookPayload = {
  user?: {
    id?: string;
    email?: string;
    email_new?: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    email_action_type?: string;
    email?: string;
    new_email?: string;
    token?: string;
    token_hash?: string;
    token_new?: string;
    token_hash_new?: string;
    redirect_to?: string;
    site_url?: string;
    [key: string]: unknown;
  };
};

type PreparedEmail = {
  recipients: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
  senderEmail: string;
  senderName: string;
  skip: boolean;
  reason?: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RAW_HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "";
const HOOK_SECRET = RAW_HOOK_SECRET
  ? RAW_HOOK_SECRET.replace("v1,whsec_", "")
  : "";
const SMTP_DEFAULTS = getSmtpConfig();
const DEFAULT_SENDER_EMAIL =
  sanitizeEmail(Deno.env.get("DEFAULT_EMAIL_SENDER")) ??
  SMTP_DEFAULTS.senderEmail;
const DEFAULT_SENDER_NAME =
  Deno.env.get("DEFAULT_EMAIL_SENDER_NAME") ?? SMTP_DEFAULTS.senderName;
const TEST_EMAIL_RECIPIENT =
  sanitizeEmail(Deno.env.get("TEST_EMAIL_RECIPIENT")) ??
  SMTP_DEFAULTS.senderEmail;
const DEFAULT_TEST_REDIRECT =
  Deno.env.get("DEFAULT_EMAIL_REDIRECT_URL") ?? "https://notionlab.ch";

const DEFAULT_SUBJECTS: Record<string, string> = {
  signup: "Confirme ton inscription",
  confirmation: "Confirme ton inscription",
  invite: "Tu es invité·e sur NotionLab",
  magiclink: "Ton lien de connexion",
  magic_link: "Ton lien de connexion",
  recovery: "Réinitialise ton mot de passe",
  email_change: "Confirme ton nouvel email",
  reauthentication: "Confirme que c’est bien toi",
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-send-email-test",
};

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function resolveRecipients(
  emailData: SendEmailHookPayload["email_data"],
  user?: SendEmailHookPayload["user"],
): string[] {
  const recipients = new Set<string>();
  if (emailData?.email) recipients.add(emailData.email);
  if (emailData?.new_email) recipients.add(emailData.new_email);
  if (user?.email) recipients.add(user.email);
  if (user?.email_new) recipients.add(user.email_new);
  return Array.from(recipients).filter(Boolean);
}

function randomNumericToken(length = 6): string {
  const digits = "0123456789";
  const result = new Array<string>(length);
  const randomValues = crypto.getRandomValues(new Uint32Array(length));
  for (let i = 0; i < length; i++) {
    result[i] = digits[randomValues[i] % digits.length];
  }
  return result.join("");
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) =>
    vars[key] ?? ""
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function buildConfirmationUrl(emailData: SendEmailHookPayload["email_data"]) {
  const tokenHash = emailData.token_hash ?? emailData.token_hash_new;
  const type = emailData.email_action_type;
  if (!tokenHash || !type) {
    return "";
  }

  try {
    const url = new URL(SUPABASE_URL);
    url.pathname = "/auth/v1/verify";
    url.searchParams.set("token", tokenHash);
    url.searchParams.set("type", type);
    if (emailData.redirect_to) {
      url.searchParams.set("redirect_to", emailData.redirect_to);
    }
    return url.toString();
  } catch (_error) {
    return "";
  }
}

async function fetchNotification(
  notificationKey: string,
): Promise<EmailNotification | null> {
  const { data, error } = await supabase
    .from<EmailNotification>("email_notifications")
    .select(
      "notification_key, title, subject, preview_text, body_html, sender_name, sender_email, force_send, is_active",
    )
    .eq("notification_key", notificationKey)
    .maybeSingle();

  if (error) {
    console.error("[send-email] fetchNotification error", error);
    return null;
  }

  return data ?? null;
}

async function prepareEmail(
  notificationKey: string,
  emailData: SendEmailHookPayload["email_data"],
  user?: SendEmailHookPayload["user"],
  options: { allowInactive?: boolean; recipientsOverride?: string[] } = {},
): Promise<PreparedEmail> {
  const normalizedKey = notificationKey.toLowerCase();
  const notification = await fetchNotification(normalizedKey);

  if (
    notification &&
    notification.is_active === false &&
    !options.allowInactive
  ) {
    return {
      skip: true,
      reason: "inactive",
      recipients: [],
      subject: "",
      htmlBody: "",
      textBody: "",
      senderEmail: "",
      senderName: "",
    };
  }

  const recipients =
    options.recipientsOverride ?? resolveRecipients(emailData, user);
  if (!recipients.length) {
    throw new Error("Aucun destinataire défini pour cette notification.");
  }

  const subject =
    notification?.subject ??
    DEFAULT_SUBJECTS[normalizedKey] ??
    "Notification NotionLab";

  const rawSenderEmail = notification?.sender_email?.trim();
  const senderEmail = rawSenderEmail &&
      rawSenderEmail.toLowerCase() !== "notifications@notionlab.co"
    ? rawSenderEmail
    : DEFAULT_SENDER_EMAIL;

  const rawSenderName = notification?.sender_name?.trim();
  const senderName = rawSenderName && rawSenderName.length > 0
    ? rawSenderName
    : DEFAULT_SENDER_NAME;

  const templateHtml = notification?.body_html ??
    `<p>Bonjour,</p><p>Ton code : <strong>{{token}}</strong>.</p><p>Ou clique ici : <a href="{{confirmation_url}}">Ouvrir mon espace</a></p><p>L’équipe NotionLab</p>`;

  const templateVars: Record<string, string> = {
    subject,
    confirmation_url: buildConfirmationUrl(emailData),
    preview_text: notification?.preview_text ?? "",
    token: emailData.token ?? "",
    token_hash: emailData.token_hash ?? "",
    token_new: emailData.token_new ?? "",
    token_hash_new: emailData.token_hash_new ?? "",
    site_url: emailData.site_url ?? "",
    redirect_to: emailData.redirect_to ?? "",
    user_email: emailData.email ?? user?.email ?? "",
    new_email:
      emailData.new_email ?? user?.email_new ?? emailData.email ?? "",
  };

  const htmlBody = applyTemplate(templateHtml, templateVars);
  const textBody = stripHtml(htmlBody) || templateVars.token || subject;

  return {
    skip: false,
    recipients,
    subject,
    htmlBody,
    textBody,
    senderEmail,
    senderName,
  };
}

async function sendEmail(
  recipients: string[],
  subject: string,
  htmlBody: string,
  textBody: string,
  senderName: string,
  senderEmail: string,
) {
  await sendSmtpMail({
    recipients,
    subject,
    htmlBody,
    textBody,
    senderEmail,
    senderName,
  });
}

function verifyWebhook(req: Request, raw: string) {
  if (!HOOK_SECRET) {
    throw new HttpError(500, "SEND_EMAIL_HOOK_SECRET is not configured");
  }

  const headers = Object.fromEntries(req.headers.entries());
  const webhook = new Webhook(HOOK_SECRET);
  try {
    return webhook.verify(raw, headers);
  } catch (error) {
    console.error("[send-email] invalid webhook signature", error);
    throw new HttpError(401, "Unauthorized webhook signature");
  }
}

serve(async (req) => {
  const isTestRequest = req.headers.get("x-send-email-test") === "1";

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  if (isTestRequest) {
    try {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response("Unauthorized", {
          status: 401,
          headers: CORS_HEADERS,
        });
      }

      const { notification_key, preview_email } = await req.json();
      if (!notification_key) {
        return new Response("notification_key requis", {
          status: 400,
          headers: CORS_HEADERS,
        });
      }

      const previewRecipient = (preview_email ?? TEST_EMAIL_RECIPIENT).trim();
      const token = randomNumericToken();
      const emailData = {
        email_action_type: notification_key,
        email: previewRecipient,
        token,
        token_hash: token,
        redirect_to: DEFAULT_TEST_REDIRECT,
        site_url: DEFAULT_TEST_REDIRECT,
      };

      const prepared = await prepareEmail(
        notification_key,
        emailData,
        { email: previewRecipient },
        {
          allowInactive: true,
          recipientsOverride: [previewRecipient],
        },
      );

      if (prepared.skip) {
        return new Response(JSON.stringify({
          skipped: true,
          reason: prepared.reason ?? "inactive",
        }), {
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json",
          },
        });
      }

      await sendEmail(
        prepared.recipients,
        prepared.subject,
        prepared.htmlBody,
        prepared.textBody,
        prepared.senderName,
        prepared.senderEmail,
      );

      return new Response(JSON.stringify({
        sent: true,
        recipients: prepared.recipients,
      }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[send-email][test] error", error);
      return new Response(
        JSON.stringify({ error: String(error?.message ?? error) }),
        {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }
  }

  const rawBody = await req.text();
  let payload: SendEmailHookPayload;

  try {
    payload = verifyWebhook(req, rawBody) as SendEmailHookPayload;
  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: error.status,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }
    console.error("[send-email] signature error", error);
    return new Response("Unauthorized", {
      status: 401,
      headers: CORS_HEADERS,
    });
  }

  const emailData = payload.email_data;
  if (!emailData) {
    return new Response("Payload invalide", {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  const notificationKey =
    emailData.email_action_type?.toLowerCase() ?? "generic";

  let prepared: PreparedEmail;
  try {
    prepared = await prepareEmail(notificationKey, emailData, payload.user);
  } catch (error) {
    console.error("[send-email] prepare error", error);
    return new Response(
      JSON.stringify({ error: String(error?.message ?? error) }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  if (prepared.skip) {
    console.log(
      `[send-email] Notification ${notificationKey} inactive, envoi ignoré.`,
    );
    return new Response(JSON.stringify({ skipped: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    await sendEmail(
      prepared.recipients,
      prepared.subject,
      prepared.htmlBody,
      prepared.textBody,
      prepared.senderName,
      prepared.senderEmail,
    );
  } catch (error) {
    console.error("[send-email] SMTP error", error);
    return new Response(
      JSON.stringify({ error: String(error?.message ?? error) }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(JSON.stringify({ sent: prepared.recipients.length }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
async function writeAllShim(writer: Deno.Writer, data: Uint8Array) {
  let written = 0;
  while (written < data.length) {
    written += await writer.write(data.subarray(written));
  }
}

if (!(Deno as unknown as { writeAll?: typeof writeAllShim }).writeAll) {
  (Deno as unknown as { writeAll?: typeof writeAllShim }).writeAll = writeAllShim;
}
