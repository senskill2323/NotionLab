// Supabase Edge Function: tts-preview
// Generates a short TTS sample using OpenAI and returns a base64-encoded audio payload.
// Requirements:
// - Set OPENAI_API_KEY in the function environment
// - Auth check against Supabase; restrict to allowed user types.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, HEAD",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info, x-supabase-authorization"
};
function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for(let i = 0; i < bytes.byteLength; i++){
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa expects binary string
  return btoa(binary);
}
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders
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
  const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: {
      headers: {
        Authorization: authHeader
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
  // Admin page is already gated in the app; tighten here if necessary.
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: "Server misconfigured: missing OPENAI_API_KEY"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
  let payload = {};
  try {
    payload = await req.json();
  } catch (_e) {
  // keep payload as empty object
  }
  const voice = typeof payload?.voice === "string" && payload.voice.trim() ? payload.voice : "verse";
  const textInput = typeof payload?.text === "string" && payload.text.trim() ? payload.text : `Bonjour, je suis la voix ${voice}. Ceci est un échantillon pour pré-écoute.`;
  try {
    const resp = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice,
        input: textInput,
        format: "mp3"
      })
    });
    if (!resp.ok) {
      const errText = await resp.text();
      return new Response(JSON.stringify({
        error: "OpenAI TTS error",
        detail: errText
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const audioBuffer = await resp.arrayBuffer();
    const audioBase64 = toBase64(audioBuffer);
    return new Response(JSON.stringify({
      audioBase64,
      contentType: "audio/mpeg"
    }), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: "Unhandled error",
      detail: String(e?.message || e)
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
