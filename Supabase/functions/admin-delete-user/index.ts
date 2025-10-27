import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};
function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      ...init.headers || {}
    },
    ...init
  });
}
function extractAvatarPath(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/");
    const idx = parts.indexOf("avatars");
    if (idx >= 0) {
      return decodeURIComponent(parts.slice(idx + 1).join("/"));
    }
  } catch (_) {
  // not a full URL, might already be a path or filename
  }
  // fallback: last segment
  const segs = url.split("/");
  return segs[segs.length - 1] || null;
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  if (req.method !== "POST") {
    return json({
      error: "Method not allowed"
    }, {
      status: 405
    });
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !serviceKey) {
    return json({
      error: "Missing environment configuration"
    }, {
      status: 500
    });
  }
  let payload;
  try {
    payload = await req.json();
  } catch (_) {
    return json({
      error: "Invalid JSON body"
    }, {
      status: 400
    });
  }
  const userId = payload?.userId;
  if (!userId || typeof userId !== "string") {
    return json({
      error: "Missing or invalid 'userId'"
    }, {
      status: 400
    });
  }
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  const serviceClient = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  // Identify caller
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) {
    return json({
      error: "Unauthorized"
    }, {
      status: 401
    });
  }
  const callerId = userRes.user.id;
  // Load caller role from profiles
  let callerRole = null;
  try {
    const { data: callerProfile } = await serviceClient.from("profiles").select("id, user_types(type_name)").eq("id", callerId).maybeSingle();
    callerRole = callerProfile?.user_types?.type_name ?? null;
  } catch (_) {
  // ignore, role may remain null
  }
  const isAdmin = callerRole === "owner" || callerRole === "admin";
  const isSelf = callerId === userId;
  if (!isAdmin && !isSelf) {
    return json({
      error: "Forbidden"
    }, {
      status: 403
    });
  }
  // Fetch target profile for cleanup and to prevent non-owner removing owner
  let targetAvatarPath = null;
  let targetRole = null;
  try {
    const { data: targetProfile } = await serviceClient.from("profiles").select("id, avatar_url, user_types(type_name)").eq("id", userId).maybeSingle();
    targetAvatarPath = extractAvatarPath(targetProfile?.avatar_url ?? null);
    targetRole = targetProfile?.user_types?.type_name ?? null;
  } catch (_) {}
  if (targetRole === "owner" && callerRole !== "owner") {
    return json({
      error: "Only an owner can delete an owner"
    }, {
      status: 403
    });
  }
  // Attempt cleanup best-effort
  try {
    if (targetAvatarPath) {
      await serviceClient.storage.from("avatars").remove([
        targetAvatarPath
      ]);
    }
  } catch (_) {
  // ignore storage errors
  }
  try {
    await serviceClient.from("profiles").delete().eq("id", userId);
  } catch (_) {
  // ignore profile deletion errors; admin delete will still proceed
  }
  // Delete auth user (removes identities as well)
  const { error: delErr } = await serviceClient.auth.admin.deleteUser(userId);
  if (delErr) {
    return json({
      error: delErr.message || "Failed to delete auth user"
    }, {
      status: 500
    });
  }
  return json({
    ok: true
  });
});
