import { corsHeaders } from "./cors.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AssistantSettings = {
  model: string;
  voice: string | null;
  realtime_url: string;
  session_config: Record<string, unknown> | null;
  video_enabled: boolean;
  ice_servers: unknown;
  flags: Record<string, unknown> | null;
  max_reconnect_attempts: number | null;
  reconnect_backoff_ms: number | null;
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const REALTIME_OUTPUT_AUDIO_FORMAT = 'pcm16';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("assistant-mint-key: missing Supabase env configuration");
}

serve(async (req) => {
  const origin = req.headers.get("Origin") ?? "*";

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "application/json",
      },
    });
  }

  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "OpenAI API key missing" }), {
      status: 500,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "application/json",
      },
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
        headers: {
          ...corsHeaders(origin),
          "Content-Type": "application/json",
        },
      });
    }

    const { data: settings, error: settingsError } = await supabase
      .from("assistant_settings")
      .select("model, voice, realtime_url, session_config, video_enabled, ice_servers, flags, max_reconnect_attempts, reconnect_backoff_ms")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<AssistantSettings>();

    if (settingsError) {
      console.error("assistant-mint-key: failed to fetch settings", settingsError);
      throw settingsError;
    }

    if (!settings) {
      return new Response(JSON.stringify({ error: "Assistant configuration missing" }), {
        status: 404,
        headers: {
          ...corsHeaders(origin),
          "Content-Type": "application/json",
        },
      });
    }

    const trimmedBaseUrl = (settings.realtime_url && settings.realtime_url.length > 0
      ? settings.realtime_url
      : "https://api.openai.com/v1/realtime")
      .replace(/\/+$/, "");
    const targetUrl = `${trimmedBaseUrl}/sessions`;

    const baseModalities = new Set<string>(["text", "audio"]);
    if (settings.video_enabled) {
      baseModalities.add("vision");
    }

    const sessionPayload: Record<string, unknown> = {
      model: settings.model,
      modalities: Array.from(baseModalities),
    };

    if (settings.voice) {
      sessionPayload.voice = settings.voice;
    }

    if (settings.session_config && typeof settings.session_config === "object") {
      const { modalities, ...restConfig } = settings.session_config as Record<string, unknown>;
      Object.assign(sessionPayload, restConfig);
      if (Array.isArray(modalities) && modalities.length) {
        const sanitized = (modalities as unknown[])
          .filter((entry) => typeof entry === "string")
          .map((entry) => String(entry));
        if (!sanitized.includes("text")) {
          sanitized.unshift("text");
        }
        sessionPayload.modalities = Array.from(new Set(sanitized));
      }
    }

    const payloadRecord = sessionPayload as Record<string, unknown>;
    payloadRecord.output_audio_format = REALTIME_OUTPUT_AUDIO_FORMAT;

    delete payloadRecord.top_p;
    delete payloadRecord.max_output_tokens;
    delete payloadRecord.response;

    const openaiResponse = await fetch(targetUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sessionPayload),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("assistant-mint-key: OpenAI error", openaiResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to mint realtime session",
          status: openaiResponse.status,
          details: errorText,
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    const sessionJson = await openaiResponse.json();

    const clientSecret = (sessionJson && typeof sessionJson === "object" && "client_secret" in sessionJson)
      ? (sessionJson as { client_secret?: { value?: string | null; expires_at?: string | null } }).client_secret ?? null
      : null;

    const payload = {
      session: sessionJson,
      secret: clientSecret?.value ?? null,
      expires_at: clientSecret?.expires_at ?? null,
      model: (sessionJson as { model?: string }).model ?? settings.model,
      iceServers: Array.isArray(settings.ice_servers) ? settings.ice_servers : [],
      reconnect: {
        maxAttempts: settings.max_reconnect_attempts ?? 3,
        backoffMs: settings.reconnect_backoff_ms ?? 2000,
      },
      flags: settings.flags ?? {},
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("assistant-mint-key: unexpected error", error);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: {
        ...corsHeaders(origin),
        "Content-Type": "application/json",
      },
    });
  }
});
