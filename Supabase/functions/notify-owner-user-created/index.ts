import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getSmtpConfig, sanitizeEmail, sendSmtpMail } from "../_shared/email.ts";
const OWNER_EMAIL = sanitizeEmail(Deno.env.get("OWNER_EMAIL")) || "yann@notionlab.ch";
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
    const { id, email, displayName, createdAt } = await req.json();
    const subject = "Compte créé, à valider !";
    const html = `
      <h2>Compte créé, à valider</h2>
      <p>Un nouvel utilisateur vient de s'inscrire. Voici les informations:</p>
      <ul>
        <li><strong>ID:</strong> ${htmlEscape(id)}</li>
        <li><strong>Email:</strong> ${htmlEscape(email)}</li>
        <li><strong>Nom:</strong> ${htmlEscape(displayName)}</li>
        <li><strong>Horodatage:</strong> ${htmlEscape(createdAt || new Date().toISOString())}</li>
      </ul>
    `;
    if (!SMTP_DEFAULTS) {
      console.log("[notify-owner-user-created] SMTP config missing. Logging payload only.", {
        id,
        email,
        displayName,
        createdAt
      });
      return new Response(JSON.stringify({ ok: true, delivered: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }
    try {
      await sendSmtpMail({
        recipients: [OWNER_EMAIL],
        subject,
        htmlBody: html,
      });
    } catch (error) {
      console.error("[notify-owner-user-created] SMTP error:", error);
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
    console.error("[notify-owner-user-created] handler error:", e);
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
