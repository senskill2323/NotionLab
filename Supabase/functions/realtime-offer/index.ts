import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, HEAD",
  // Superset for Supabase JS client preflight: authorization, apikey, x-client-info, content-type
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-authorization"
};
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const { sdp } = await req.json().catch(()=>({
        sdp: null
      }));
    if (!sdp || typeof sdp !== "string") {
      return new Response(JSON.stringify({
        error: "Missing SDP offer"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
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
    // Accept any authenticated user for this Edge Function.
    // The UI access is already restricted to admin area; adjust here if you want stricter role checks.
    // Check global assistant settings (kill-switch, overrides)
    const { data: settings } = await supabase.from("assistant_settings").select("enabled,instructions,voice,speech_rate").eq("id", "GLOBAL").maybeSingle();
    if (settings && settings.enabled === false) {
      return new Response(JSON.stringify({
        error: "assistant_disabled"
      }), {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({
        error: "Server misconfigured (OPENAI_API_KEY)"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Utiliser votre préférence par défaut si aucun secret n'est posé
    const model = Deno.env.get("OPENAI_REALTIME_MODEL") || "gpt-realtime";
    const voice = settings?.voice && String(settings.voice) || Deno.env.get("OPENAI_REALTIME_VOICE") || "verse"; // female-like voice preference
    // Donner des instructions explicites pour favoriser une réponse vocale naturelle
    const instructions = settings?.instructions && String(settings.instructions) || Deno.env.get("OPENAI_REALTIME_INSTRUCTIONS") || "Tu es l'assistante NotionLab. Réponds en français, de manière concise et chaleureuse. Réponds à l'oral immédiatement quand tu entends l'utilisateur.";
    const url = `https://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}&voice=${encodeURIComponent(voice)}&instructions=${encodeURIComponent(instructions)}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        "Accept": "application/sdp",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "OpenAI-Beta": "realtime=v1"
      },
      body: sdp
    });
    if (!upstream.ok) {
      const errText = await upstream.text();
      return new Response(JSON.stringify({
        error: "Upstream realtime error",
        model,
        voice,
        details: errText
      }), {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const answerSdp = await upstream.text();
    return new Response(JSON.stringify({
      sdp: answerSdp
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
