import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";
import { writeAll } from "https://deno.land/std@0.115.1/io/util.ts";
// Patch smtp@0.7.0 which relies on the deprecated Deno.writeAll API.
// deno-lint-ignore no-explicit-any
const denoAny = Deno as any;
if (typeof denoAny.writeAll !== "function") {
  denoAny.writeAll = writeAll;
}
import { HttpError } from "./auth.ts";

const PLACEHOLDER_VALUES = new Set([
  "",
  " ",
  "...",
  "…",
  "null",
  "undefined",
]);

function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const raw = Deno.env.get(key);
    if (!raw) continue;
    const value = raw.trim();
    if (!value || PLACEHOLDER_VALUES.has(value.toLowerCase())) continue;
    return value;
  }
  return undefined;
}

export function sanitizeEmail(value?: string | null): string | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;
  if (!candidate.includes("@")) return undefined;
  return candidate;
}

export type SmtpConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  senderEmail: string;
  senderName: string;
  secure: boolean;
};

export function getSmtpConfig(
  options: { required?: boolean } = {},
): SmtpConfig | undefined {
  const required = options.required ?? true;
  const host = readEnv("SMTP_HOST", "HOSTINGER_SMTP_HOST");
  const username = readEnv("SMTP_USERNAME", "SMTP_USER");
  const password = readEnv("SMTP_PASSWORD", "SMTP_PASS");
  const portValue = readEnv("SMTP_PORT");
  const encryption =
    readEnv("SMTP_ENCRYPTION", "SMTP_SECURE")?.toLowerCase() ?? "";

  if (required && (!host || !username || !password)) {
    throw new HttpError(500, "SMTP configuration is incomplete");
  }

  if (!host || !username || !password) {
    return undefined;
  }

  let port = Number.parseInt(portValue ?? "", 10);
  if (!Number.isFinite(port)) {
    port = 465;
  }

  let secure = true;
  if (["false", "0", "disable", "disabled", "none"].includes(encryption)) {
    secure = false;
  } else if (encryption === "starttls" || encryption === "tls_optional") {
    secure = false;
  } else if (!encryption) {
    secure = port === 465;
  } else {
    secure = true;
  }

  const senderEmail =
    sanitizeEmail(readEnv("DEFAULT_EMAIL_SENDER")) ??
    sanitizeEmail(readEnv("SMTP_FROM_EMAIL")) ??
    sanitizeEmail(username) ??
    sanitizeEmail(readEnv("SENDER_EMAIL")) ??
    username;

  const senderName =
    readEnv("DEFAULT_EMAIL_SENDER_NAME", "SMTP_SENDER_NAME") ?? "NotionLab";

  return {
    host,
    port,
    username,
    password,
    senderEmail,
    senderName,
    secure,
  };
}

export type SmtpMailPayload = {
  recipients: string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  senderEmail?: string;
  senderName?: string;
};

export async function sendSmtpMail(mail: SmtpMailPayload) {
  const config = getSmtpConfig();
  const senderEmail = sanitizeEmail(mail.senderEmail) ?? config.senderEmail;
  const senderName = mail.senderName?.trim() || config.senderName;
  const textBody = mail.textBody ??
    mail.htmlBody?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ??
    "";

  if (!senderEmail) {
    throw new HttpError(500, "SMTP sender email not configured");
  }

  if (!mail.subject) {
    throw new HttpError(500, "SMTP mail subject is required");
  }

  if (!textBody && !mail.htmlBody) {
    throw new HttpError(
      500,
      "SMTP mail requires at least a text or HTML body",
    );
  }

  const client = new SmtpClient();
  try {
    if (config.secure) {
      await client.connectTLS({
        hostname: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
      });
    } else {
      await client.connect({
        hostname: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
      });
    }

    const fromAddress = `${senderName} <${senderEmail}>`;
    for (const recipient of mail.recipients) {
      await client.send({
        from: fromAddress,
        to: recipient,
        subject: mail.subject,
        content: textBody,
        html: mail.htmlBody ?? textBody,
      });
    }
  } finally {
    await client.close();
  }
}
