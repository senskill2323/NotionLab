import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSmtpConfig, sanitizeEmail, sendSmtpMail } from "../_shared/email.ts";
const SMTP_DEFAULTS = getSmtpConfig({ required: false });
function htmlEscape(str) {
  return String(str || "").replace(/[&<>"']/g, (c)=>({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
}
Deno.serve(async (req)=>{
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405
    });
  }
  try {
    const { email, displayName, activatedAt } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Missing email"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const subject = "Votre compte est activé";
    const name = htmlEscape(displayName || "");
    const html = `
      <h2>Bienvenue sur NotionLab</h2>
      <p>Bonjour ${name || ""},</p>
      <p>Votre compte a été validé. Vous pouvez maintenant vous connecter et accéder à votre tableau de bord.</p>
      <p style="color:#666;font-size:12px">Activé le: ${htmlEscape(activatedAt || new Date().toISOString())}</p>
    `;
    if (!SMTP_DEFAULTS) {
      console.log("[notify-user-account-activated] SMTP config missing. Logging payload only.", {
        email,
        displayName,
        activatedAt
      });
      return new Response(JSON.stringify({ ok: true, delivered: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    try {
      await sendSmtpMail({
        recipients: [sanitizeEmail(email) ?? email],
        subject,
        htmlBody: html,
      });
    } catch (error) {
      console.error("[notify-user-account-activated] SMTP error:", error);
      return new Response(JSON.stringify({ ok: false, error: String(error?.message ?? error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({ ok: true, delivered: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (e) {
    console.error("[notify-user-account-activated] handler error:", e);
    return new Response(JSON.stringify({
      ok: false,
      error: String(e?.message || e)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
