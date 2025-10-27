import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Resend } from "npm:resend@3.4.0";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const OWNER_EMAIL = Deno.env.get("OWNER_EMAIL") || "yann@bluewin.ch";
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
    if (!resend) {
      console.log("[notify-owner-user-created] RESEND_API_KEY not set. Logging payload only.", {
        id,
        email,
        displayName,
        createdAt
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
        OWNER_EMAIL
      ],
      subject,
      html
    });
    if (error) {
      console.error("[notify-owner-user-created] Resend error:", error);
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
