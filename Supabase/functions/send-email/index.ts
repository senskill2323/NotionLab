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
  id: string;
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

type NotificationEvent = {
  id: string;
  event_key: string;
  is_active: boolean | null;
};

type NotificationEventTemplateRow = {
  is_primary: boolean | null;
  priority: number | null;
  email_notifications: EmailNotification | null;
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
    notification_event_key?: string;
    notification_key?: string;
    [key: string]: unknown;
  };
  notification_event_key?: string;
  notification_key?: string;
  trigger?: string;
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
  notificationKey?: string | null;
  eventKey?: string | null;
  forceSend: boolean;
};

type LogContext = {
  eventKey?: string | null;
  notificationKey?: string | null;
  recipientCount: number;
  forceSend: boolean;
  trigger: string;
  correlationId: string;
  skipped?: boolean;
  skipReason?: string;
  isTest?: boolean;
};

type PrepareEmailArgs = {
  notificationKey?: string | null;
  notificationEventKey?: string | null;
  emailData: SendEmailHookPayload["email_data"];
  user?: SendEmailHookPayload["user"];
  allowInactive?: boolean;
  recipientsOverride?: string[];
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

const NOTIFICATION_EVENT_ALIASES: Record<string, string> = {
  signup: "auth.signup",
  confirmation: "auth.signup",
  invite: "auth.invite",
  magiclink: "auth.magic_link",
  magic_link: "auth.magic_link",
  recovery: "auth.password_recovery",
  password_recovery: "auth.password_recovery",
  email_change: "auth.email_change",
  reauthentication: "auth.reauthentication",
  "account-activated": "user.account.activated",
  "owner-new-user": "owner.user.created",
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-send-email-test",
};

const LOG_SOURCE = "send-email";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function normalizeKey(value?: string | null): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toLowerCase() : null;
}

function resolveEventKeyAlias(notificationKey?: string | null): string | null {
  const normalized = normalizeKey(notificationKey);
  return normalized ? NOTIFICATION_EVENT_ALIASES[normalized] ?? null : null;
}

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

async function fetchNotificationByKey(
  notificationKey: string,
): Promise<EmailNotification | null> {
  const normalized = normalizeKey(notificationKey);
  if (!normalized) {
    return null;
  }

  const { data, error } = await supabase
    .from<EmailNotification>("email_notifications")
    .select(
      "id, notification_key, title, subject, preview_text, body_html, sender_name, sender_email, force_send, is_active",
    )
    .eq("notification_key", normalized)
    .maybeSingle();

  if (error) {
    console.error("[send-email] fetchNotificationByKey error", error);
    throw new HttpError(
      500,
      "Impossible de charger la notification demandée",
    );
  }

  return data ?? null;
}

async function resolveNotificationEvent(
  eventKey: string,
  options: { allowInactive?: boolean } = {},
): Promise<{
  event: NotificationEvent;
  notification: EmailNotification | null;
  skipReason?: string;
}> {
  const normalized = normalizeKey(eventKey);
  if (!normalized) {
    throw new HttpError(400, "notification_event_key invalide");
  }

  const { data: event, error: eventError } = await supabase
    .from<NotificationEvent>("notification_events")
    .select("id, event_key, is_active")
    .eq("event_key", normalized)
    .maybeSingle();

  if (eventError) {
    console.error("[send-email] resolveNotificationEvent lookup error", eventError);
    throw new HttpError(500, "Impossible de charger l'événement");
  }

  if (!event) {
    throw new HttpError(
      404,
      `Aucun événement trouvé pour notification_event_key '${eventKey}'`,
    );
  }

  if (event.is_active === false && !options.allowInactive) {
    return { event, notification: null, skipReason: "inactive_event" };
  }

  const { data: templates, error: templateError } = await supabase
    .from<NotificationEventTemplateRow>("notification_event_templates")
    .select(
      `is_primary,
       priority,
       email_notifications (
         id,
         notification_key,
         title,
         subject,
         preview_text,
         body_html,
         sender_name,
         sender_email,
         force_send,
         is_active
       )`,
    )
    .eq("event_id", event.id)
    .order("is_primary", { ascending: false })
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (templateError) {
    console.error(
      "[send-email] resolveNotificationEvent templates error",
      templateError,
    );
    throw new HttpError(500, "Impossible de charger les templates de l'événement");
  }

  if (!templates || templates.length === 0) {
    if (options.allowInactive) {
      return { event, notification: null, skipReason: "no_template" };
    }
    throw new HttpError(
      404,
      `Aucun template associé à l'événement '${event.event_key}'`,
    );
  }

  const activeTemplate = templates.find((row) =>
    row.email_notifications &&
    row.email_notifications.is_active !== false
  );

  const fallbackTemplate = templates.find((row) => row.email_notifications);

  const chosenTemplate = activeTemplate?.email_notifications ??
    (options.allowInactive ? fallbackTemplate?.email_notifications ?? null : null);

  if (!chosenTemplate) {
    if (options.allowInactive) {
      return { event, notification: null, skipReason: "no_template" };
    }
    throw new HttpError(
      404,
      `Aucun template actif pour l'événement '${event.event_key}'`,
    );
  }

  return { event, notification: chosenTemplate ?? null };
}

function logNotificationAttempt(ctx: LogContext) {
  const payload: Record<string, unknown> = {
    source: LOG_SOURCE,
    event_key: ctx.eventKey ?? null,
    notification_key: ctx.notificationKey ?? null,
    recipient_count: ctx.recipientCount,
    force_send: ctx.forceSend,
    trigger: ctx.trigger,
    correlation_id: ctx.correlationId,
  };

  if (ctx.skipped) {
    payload.skipped = true;
    payload.skip_reason = ctx.skipReason ?? null;
  }

  if (ctx.isTest) {
    payload.test = true;
  }

  console.log(JSON.stringify(payload));
}

function deriveNotificationContext(
  payload: SendEmailHookPayload,
): { notificationKey?: string | null; notificationEventKey?: string | null } {
  const emailActionType = typeof payload.email_data?.email_action_type === "string"
    ? payload.email_data.email_action_type
    : undefined;

  const explicitNotificationKey = typeof payload.notification_key === "string"
    ? payload.notification_key
    : typeof payload.email_data?.notification_key === "string"
    ? payload.email_data.notification_key
    : undefined;

  const notificationKey = explicitNotificationKey ?? emailActionType ?? null;

  const explicitEventKey = typeof payload.notification_event_key === "string"
    ? payload.notification_event_key
    : typeof payload.email_data?.notification_event_key === "string"
    ? payload.email_data.notification_event_key
    : undefined;

  const emailActionEvent = emailActionType && emailActionType.includes(".")
    ? emailActionType
    : undefined;

  const aliasFromNotification = notificationKey
    ? resolveEventKeyAlias(notificationKey)
    : null;
  const aliasFromAction = emailActionType
    ? resolveEventKeyAlias(emailActionType)
    : null;

  const notificationEventKey = explicitEventKey ??
    emailActionEvent ??
    aliasFromNotification ??
    aliasFromAction ??
    null;

  return { notificationKey, notificationEventKey };
}

function detectTrigger(
  req: Request,
  payload: SendEmailHookPayload | null,
  options: { isTest?: boolean; eventKey?: string | null } = {},
): string {
  if (options.isTest) return "test";
  if (payload?.trigger && typeof payload.trigger === "string") {
    return payload.trigger;
  }
  if (req.headers.get("svix-id")) {
    return "svix";
  }
  if (options.eventKey) {
    return "service-role";
  }
  return "unknown";
}

async function prepareEmail(
  args: PrepareEmailArgs,
): Promise<PreparedEmail> {
  const {
    notificationKey,
    notificationEventKey,
    emailData,
    user,
    allowInactive = false,
    recipientsOverride,
  } = args;

  const normalizedEventKey = normalizeKey(notificationEventKey);
  const normalizedNotificationKey = normalizeKey(notificationKey);

  let eventResolution:
    | {
      event: NotificationEvent;
      notification: EmailNotification | null;
      skipReason?: string;
    }
    | null = null;

  if (normalizedEventKey) {
    eventResolution = await resolveNotificationEvent(normalizedEventKey, {
      allowInactive,
    });

    if (eventResolution.skipReason && !allowInactive) {
      return {
        skip: true,
        reason: eventResolution.skipReason,
        recipients: [],
        subject: "",
        htmlBody: "",
        textBody: "",
        senderEmail: "",
        senderName: "",
        eventKey: eventResolution.event.event_key,
        notificationKey: eventResolution.notification?.notification_key ??
          normalizedNotificationKey,
        forceSend: Boolean(eventResolution.notification?.force_send),
      };
    }
  }

  const notificationRecord = eventResolution?.notification ??
    (normalizedNotificationKey
      ? await fetchNotificationByKey(normalizedNotificationKey)
      : null);

  if (!notificationRecord && normalizedEventKey) {
    throw new HttpError(
      404,
      `Aucun template actif pour l'événement '${normalizedEventKey}'`,
    );
  }

  const notificationKeyToUse = notificationRecord?.notification_key ??
    normalizedNotificationKey ?? null;
  const eventKeyToUse = eventResolution?.event.event_key ??
    normalizedEventKey ?? null;

  if (
    notificationRecord &&
    notificationRecord.is_active === false &&
    !allowInactive
  ) {
    return {
      skip: true,
      reason: "inactive_notification",
      recipients: [],
      subject: "",
      htmlBody: "",
      textBody: "",
      senderEmail: "",
      senderName: "",
      eventKey: eventKeyToUse,
      notificationKey: notificationKeyToUse,
      forceSend: Boolean(notificationRecord.force_send),
    };
  }

  const recipients =
    recipientsOverride ?? resolveRecipients(emailData, user);
  if (!recipients.length) {
    throw new HttpError(
      400,
      "Aucun destinataire défini pour cette notification.",
    );
  }

  const normalizedSubjectKey = normalizeKey(notificationKeyToUse);
  const subject =
    notificationRecord?.subject ??
    (normalizedSubjectKey ? DEFAULT_SUBJECTS[normalizedSubjectKey] : undefined) ??
    "Notification NotionLab";

  const rawSenderEmail = notificationRecord?.sender_email?.trim();
  const senderEmail = rawSenderEmail &&
      rawSenderEmail.toLowerCase() !== "notifications@notionlab.co"
    ? rawSenderEmail
    : DEFAULT_SENDER_EMAIL;

  const rawSenderName = notificationRecord?.sender_name?.trim();
  const senderName = rawSenderName && rawSenderName.length > 0
    ? rawSenderName
    : DEFAULT_SENDER_NAME;

  const templateHtml = notificationRecord?.body_html ??
    `<p>Bonjour,</p><p>Ton code : <strong>{{token}}</strong>.</p><p>Ou clique ici : <a href="{{confirmation_url}}">Ouvrir mon espace</a></p><p>L’équipe NotionLab</p>`;

  const templateVars: Record<string, string> = {
    subject,
    confirmation_url: buildConfirmationUrl(emailData),
    preview_text: notificationRecord?.preview_text ?? "",
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
    eventKey: eventKeyToUse,
    notificationKey: notificationKeyToUse,
    forceSend: Boolean(notificationRecord?.force_send),
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

      const body = await req.json();
      const notificationKey = typeof body.notification_key === "string"
        ? body.notification_key
        : undefined;
      const notificationEventKey = typeof body.notification_event_key === "string"
        ? body.notification_event_key
        : undefined;
      const previewRecipient = (body.preview_email ?? TEST_EMAIL_RECIPIENT).trim();

      const token = randomNumericToken();
      const actionType = typeof body.email_action_type === "string"
        ? body.email_action_type
        : notificationKey ?? notificationEventKey ?? "preview";

      const emailData = {
        email_action_type: actionType,
        email: previewRecipient,
        token,
        token_hash: token,
        redirect_to: DEFAULT_TEST_REDIRECT,
        site_url: DEFAULT_TEST_REDIRECT,
      };

      const prepared = await prepareEmail({
        notificationKey,
        notificationEventKey,
        emailData,
        user: { email: previewRecipient },
        allowInactive: true,
        recipientsOverride: [previewRecipient],
      });

      const correlationId = crypto.randomUUID();

      if (prepared.skip) {
        logNotificationAttempt({
          eventKey: prepared.eventKey,
          notificationKey: prepared.notificationKey,
          recipientCount: 0,
          forceSend: prepared.forceSend,
          trigger: detectTrigger(req, null, { isTest: true }),
          correlationId,
          skipped: true,
          skipReason: prepared.reason,
          isTest: true,
        });

        return new Response(JSON.stringify({
          skipped: true,
          reason: prepared.reason ?? "inactive",
          event_key: prepared.eventKey ?? null,
          notification_key: prepared.notificationKey ?? null,
          correlation_id: correlationId,
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

      logNotificationAttempt({
        eventKey: prepared.eventKey,
        notificationKey: prepared.notificationKey,
        recipientCount: prepared.recipients.length,
        forceSend: prepared.forceSend,
        trigger: detectTrigger(req, null, { isTest: true }),
        correlationId,
        isTest: true,
      });

      return new Response(JSON.stringify({
        sent: prepared.recipients.length,
        recipients: prepared.recipients,
        event_key: prepared.eventKey ?? null,
        notification_key: prepared.notificationKey ?? null,
        correlation_id: correlationId,
      }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[send-email][test] error", error);
      const message = error instanceof HttpError
        ? error.message
        : String(error?.message ?? error);
      const status = error instanceof HttpError ? error.status : 500;
      return new Response(
        JSON.stringify({ error: message }),
        {
          status,
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

  const context = deriveNotificationContext(payload);

  let prepared: PreparedEmail;
  try {
    prepared = await prepareEmail({
      notificationKey: context.notificationKey ?? undefined,
      notificationEventKey: context.notificationEventKey ?? undefined,
      emailData,
      user: payload.user,
    });
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
    console.error("[send-email] prepare error", error);
    return new Response(
      JSON.stringify({ error: String(error?.message ?? error) }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  const correlationId = crypto.randomUUID();
  const trigger = detectTrigger(req, payload, {
    eventKey: prepared.eventKey ?? context.notificationEventKey ?? null,
  });

  if (prepared.skip) {
    logNotificationAttempt({
      eventKey: prepared.eventKey ?? context.notificationEventKey,
      notificationKey: prepared.notificationKey ?? context.notificationKey,
      recipientCount: 0,
      forceSend: prepared.forceSend,
      trigger,
      correlationId,
      skipped: true,
      skipReason: prepared.reason,
    });

    console.log(
      `[send-email] Notification ${
        prepared.notificationKey ?? context.notificationKey ?? "unknown"
      } skipped (${prepared.reason ?? "unknown reason"})`,
    );

    return new Response(JSON.stringify({
      skipped: true,
      reason: prepared.reason ?? "inactive",
      event_key: prepared.eventKey ?? context.notificationEventKey ?? null,
      notification_key: prepared.notificationKey ?? context.notificationKey ?? null,
      correlation_id: correlationId,
    }), {
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

  logNotificationAttempt({
    eventKey: prepared.eventKey ?? context.notificationEventKey,
    notificationKey: prepared.notificationKey ?? context.notificationKey,
    recipientCount: prepared.recipients.length,
    forceSend: prepared.forceSend,
    trigger,
    correlationId,
  });

  return new Response(JSON.stringify({
    sent: prepared.recipients.length,
    recipients: prepared.recipients,
    event_key: prepared.eventKey ?? context.notificationEventKey ?? null,
    notification_key: prepared.notificationKey ?? context.notificationKey ?? null,
    correlation_id: correlationId,
  }), {
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
