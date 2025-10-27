import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@3.4.0";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "no-reply@notionlab.app";
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
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
    if (!resend) {
      console.log("[notify-user-account-activated] RESEND_API_KEY not set. Logging payload only.", {
        email,
        displayName,
        activatedAt
      });
      return new Response(JSON.stringify({
        ok: true,
        delivered: false
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const { data, error } = await resend.emails.send({
      from: SENDER_EMAIL,
      to: [
        email
      ],
      subject,
      html
    });
    if (error) {
      console.error("[notify-user-account-activated] Resend error:", error);
      return new Response(JSON.stringify({
        ok: false,
        error
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    return new Response(JSON.stringify({
      ok: true,
      data
    }), {
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
