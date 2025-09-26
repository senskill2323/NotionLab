import { corsHeaders } from "./cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type PreviewRequest = {
  voice?: string;
  format?: string;
  text?: string;
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PREVIEW_MODEL = Deno.env.get("ASSISTANT_PREVIEW_MODEL") ?? "gpt-4o-mini-tts";

const FORMAT_MAP: Record<string, string> = {
  mp3: "mp3",
  wav: "wav",
  ogg: "ogg",
  pcm16: "pcm16",
};

const MIME_MAP: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  pcm16: "audio/wave",
};

const MAX_TEXT_LENGTH = 120;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function buildPreviewText(rawText: string | undefined, voice: string): string {
  const fallback = `Hello, I am the ${voice} voice.`;
  if (!rawText || typeof rawText !== "string") {
    return fallback;
  }
  const text = rawText.trim();
  if (!text.length) return fallback;
  return text.slice(0, MAX_TEXT_LENGTH);
}

serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "*";

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  if (!OPENAI_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server configuration incomplete" }), {
      status: 500,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as PreviewRequest | Record<string, unknown>;
    const rawVoice = typeof body.voice === "string" ? body.voice.trim() : "";
    const voice = rawVoice.length ? rawVoice : "verse";

    const rawFormat = typeof body.format === "string" ? body.format.trim().toLowerCase() : "";
    const format = FORMAT_MAP[rawFormat] ?? "mp3";

    const previewText = buildPreviewText(typeof body.text === "string" ? body.text : undefined, voice);

    const openaiResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: PREVIEW_MODEL,
        voice,
        input: previewText,
        format,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("assistant-voice-preview: OpenAI error", openaiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Preview failed", details: errorText }), {
        status: 502,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const audioArrayBuffer = await openaiResponse.arrayBuffer();
    const base64Audio = toBase64(audioArrayBuffer);

    return new Response(
      JSON.stringify({
        audio_base64: base64Audio,
        format,
        mime: MIME_MAP[format] ?? "audio/mpeg",
      }),
      {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("assistant-voice-preview: unexpected error", error);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  }
});
