import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // Autoriser les en-têtes utilisés par le client Supabase
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-authorization"
};
// Helper: append token as query param if provided (server-side only)
function withToken(urlStr, token) {
  if (!token) return urlStr;
  try {
    const u = new URL(urlStr);
    u.searchParams.set("token", token);
    return u.toString();
  } catch  {
    return urlStr + (urlStr.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(token);
  }
}
const ALLOWED_USER_TYPES = new Set([
  "owner",
  "admin",
  "client"
]);
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({
        error: "Method not allowed"
      }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
    const N8N_RAG_WEBHOOK_URL = Deno.env.get("N8N_RAG_WEBHOOK_URL");
    const N8N_RAG_TOKEN = Deno.env.get("N8N_RAG_TOKEN");
    if (!supabaseUrl || !supabaseAnon) {
      return new Response(JSON.stringify({
        error: "Server misconfigured (Supabase env)"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    if (!N8N_RAG_WEBHOOK_URL) {
      return new Response(JSON.stringify({
        error: "Server misconfigured (N8N_RAG_WEBHOOK_URL)"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const authHeader = req.headers.get("authorization");
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: {
        headers: {
          Authorization: authHeader ?? ""
        }
      }
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({
        error: "Unauthorized"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const { data: profile } = await supabase.from("profiles").select("user_type").eq("id", userData.user.id).maybeSingle();
    const userType = profile?.user_type ?? "guest";
    if (!ALLOWED_USER_TYPES.has(userType)) {
      return new Response(JSON.stringify({
        error: "Forbidden"
      }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const { query, includeSources, image, file } = await req.json().catch(()=>({}));
    const systemPrompt = `Tu es “L’assistant de Yann”, guide Notion/NotionLab francophone. Tu tutoies, restes chaleureux et concret, et parles avec des phrases courtes. Avant de répondre à une question qui exige du contexte, appelle rag_search avec une requête concise ; n’affiche les sources que si l’utilisateur te le demande (“montre les sources”). Tu peux analyser des images envoyées (snapshot ou upload) pour comprendre des bases Notion, schémas, captures d’écran et proposer des actions. Tu disposes d’une mémoire longue par client : rappelle les préférences et l’historique utile, mets-la à jour avec parcimonie, ne stocke jamais d’informations sensibles. Si les documents sont inaccessibles, informe : “Je n’ai pas accès à ces documents, je tente une réponse générique.” En cas de déconnexion Realtime, informe : “Connexion instable, je tente de me reconnecter…” puis reprends la conversation dès que possible. Ta langue est exclusivement le français. Évite le jargon inutile, propose des pas-à-pas concrets et des formulations directement copiables dans Notion (titres de DB, propriétés, relations, formules), et reste synthétique.`;
    const payload = {
      query,
      includeSources: !!includeSources,
      userId: userData.user.id,
      system_prompt: systemPrompt,
      attachments: {
        imageDataUrl: typeof image === "string" ? image : null,
        file: file && typeof file === "object" ? file : null
      }
    };
    const upstream = await fetch(withToken(N8N_RAG_WEBHOOK_URL, N8N_RAG_TOKEN), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!upstream.ok) {
      return new Response(JSON.stringify({
        answer: null,
        unavailable: true
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const resJson = await upstream.json().catch(()=>({}));
    const answer = resJson?.answer || resJson?.data || resJson?.text || "";
    const sources = Array.isArray(resJson?.sources) ? resJson.sources : [];
    return new Response(JSON.stringify({
      answer,
      sources
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: "Unexpected error",
      details: String(e?.message || e)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
