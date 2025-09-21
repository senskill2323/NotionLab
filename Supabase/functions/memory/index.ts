import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // Autoriser les en-têtes utilisés par le client Supabase
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-authorization",
};

// Helper: append token as query param if provided
function withToken(urlStr: string, token?: string) {
  if (!token) return urlStr;
  try {
    const u = new URL(urlStr);
    u.searchParams.set("token", token);
    return u.toString();
  } catch {
    return urlStr + (urlStr.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(token);
  }
}

const ALLOWED_USER_TYPES = new Set(["owner", "admin", "client"]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnon) {
      return new Response(JSON.stringify({ error: "Server misconfigured (Supabase env)" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const authHeader = req.headers.get("authorization");
    const supabase = createClient(supabaseUrl, supabaseAnon, { global: { headers: { Authorization: authHeader ?? "" } } });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", userData.user.id)
      .maybeSingle();

    const userType = profile?.user_type ?? "guest";
    if (!ALLOWED_USER_TYPES.has(userType)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Kill-switch global (assistant_settings)
    const { data: settings } = await supabase
      .from("assistant_settings")
      .select("enabled")
      .eq("id", "GLOBAL")
      .maybeSingle();
    if (settings && settings.enabled === false) {
      return new Response(JSON.stringify({ ok: false, error: "assistant_disabled" }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const body = await req.json().catch(() => ({}));
    const legacyAction = typeof (body?.action) === "string" ? body.action : undefined;
    const hasKeyValue = typeof (body?.key) === "string" && Object.prototype.hasOwnProperty.call(body, "value");
    const isWrite = legacyAction === "update" || hasKeyValue;
    const action = isWrite ? "update" : "get";
    const patch = (body && typeof body.patch === "object" && body.patch) ? (body.patch as Record<string, unknown>) : undefined;

    // Proxy mémoire vers n8n (lecture/écriture sur deux webhooks distincts)
    const N8N_MEMORY_WRITE_URL = Deno.env.get("N8N_MEMORY_WEBHOOK_URL"); // écriture
    const N8N_MEMORY_SEARCH_URL = Deno.env.get("N8N_MEMORY_SEARCH_URL"); // lecture
    const N8N_MEMORY_WRITE_TOKEN = Deno.env.get("N8N_MEMORY_WRITE_TOKEN") ?? Deno.env.get("N8N_MEMORY_TOKEN");
    const N8N_MEMORY_SEARCH_TOKEN = Deno.env.get("N8N_MEMORY_SEARCH_TOKEN") ?? Deno.env.get("N8N_MEMORY_TOKEN");
    if (action === "update" && !N8N_MEMORY_WRITE_URL) {
      return new Response(JSON.stringify({ ok: false, error: "Server misconfigured (N8N_MEMORY_WEBHOOK_URL)" }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    if (action !== "update" && !N8N_MEMORY_SEARCH_URL) {
      return new Response(JSON.stringify({ ok: false, error: "Server misconfigured (N8N_MEMORY_SEARCH_URL)" }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const userId = userData.user.id;

    if (action === "update") {
      // WRITE: prefer { userId, key, value }, but accept legacy { patch } (can contain 1..n entries)
      if (hasKeyValue) {
        const payload = { userId, key: String(body.key), value: (body as Record<string, unknown>)["value"] };
        const upstream = await fetch(withToken(N8N_MEMORY_WRITE_URL as string, N8N_MEMORY_WRITE_TOKEN), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!upstream.ok) {
          const details = await upstream.text().catch(() => "");
          return new Response(JSON.stringify({ ok: false, error: "Upstream memory webhook error", details }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
        const res = await upstream.json().catch(() => ({}));
        return new Response(JSON.stringify(res), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      if (patch && typeof patch === "object") {
        const keys = Object.keys(patch);
        if (keys.length === 0) {
          return new Response(JSON.stringify({ ok: false, error: "Missing key/value or patch" }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }
        if (keys.length === 1) {
          const k = keys[0];
          const payload = { userId, key: k, value: (patch as Record<string, unknown>)[k] };
          const upstream = await fetch(withToken(N8N_MEMORY_WRITE_URL as string, N8N_MEMORY_WRITE_TOKEN), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!upstream.ok) {
            const details = await upstream.text().catch(() => "");
            return new Response(JSON.stringify({ ok: false, error: "Upstream memory webhook error", details }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
          }
          const res = await upstream.json().catch(() => ({}));
          return new Response(JSON.stringify(res), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
        }

        // Multiple entries: fan-out sequentially
        const results: Array<{ key: string; ok: boolean; data?: unknown; details?: string }> = [];
        for (const k of keys) {
          const v = (patch as Record<string, unknown>)[k];
          const up = await fetch(withToken(N8N_MEMORY_WRITE_URL as string, N8N_MEMORY_WRITE_TOKEN), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, key: k, value: v }),
          });
          if (!up.ok) {
            const details = await up.text().catch(() => "");
            results.push({ key: k, ok: false, details });
          } else {
            const rj = await up.json().catch(() => ({}));
            results.push({ key: k, ok: rj?.ok !== false, data: rj?.data });
          }
        }
        const allOk = results.every((r) => r.ok);
        return new Response(JSON.stringify({ ok: allOk, results }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      return new Response(JSON.stringify({ ok: false, error: "Missing key/value or patch" }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // READ/SEARCH: { userId, query?, top_k? }
    const readPayload: Record<string, unknown> = { userId };
    if (typeof (body as Record<string, unknown>)["query"] === "string") {
      readPayload.query = (body as Record<string, unknown>)["query"];
    }
    if (typeof (body as Record<string, unknown>)["top_k"] === "number") {
      readPayload.top_k = (body as Record<string, unknown>)["top_k"];
    }
    const upstream = await fetch(withToken(N8N_MEMORY_SEARCH_URL as string, N8N_MEMORY_SEARCH_TOKEN), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(readPayload),
    });
    if (!upstream.ok) {
      const details = await upstream.text().catch(() => "");
      return new Response(JSON.stringify({ ok: false, error: "Upstream memory webhook error", details }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const res = await upstream.json().catch(() => ({}));
    return new Response(JSON.stringify(res), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(e?.message || e) }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
