import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";

type DeletePayload = {
  userId?: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const getRpcClient = (accessToken: string) =>
  createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "x-supabase-authorization": `Bearer ${accessToken}`,
      },
    },
  });

const getUserFromToken = async (token: string) => {
  const { data, error } = await serviceClient.auth.getUser(token);
  if (error || !data?.user) {
    return { error: "UNAUTHORIZED" as const };
  }
  return { user: data.user };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Service configuration missing." }, 500);
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/Bearer\s+/i, "").trim();
    if (!token) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const session = await getUserFromToken(token);
    if (!("user" in session)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    let payload: DeletePayload = {};
    try {
      if (req.headers.get("Content-Type")?.includes("application/json")) {
        payload = await req.json();
      }
    } catch (_) {
      // ignore malformed body
    }

    const targetUserId = payload.userId ?? session.user.id;
    if (!targetUserId) {
      return jsonResponse({ error: "User id is required" }, 400);
    }

    const { data: requesterProfile, error: requesterError } = await serviceClient
      .from("profiles")
      .select("id, user_types(type_name)")
      .eq("id", session.user.id)
      .single();

    if (requesterError || !requesterProfile) {
      return jsonResponse({ error: "Requester profile not found" }, 403);
    }

    const requesterType = requesterProfile.user_types?.type_name ?? "guest";
    const isSelfDeletion = session.user.id === targetUserId;

    let targetType = requesterType;
    if (!isSelfDeletion) {
      const allowed = new Set(["owner", "admin"]);
      if (!allowed.has(requesterType)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const { data: targetProfile, error: targetError } = await serviceClient
        .from("profiles")
        .select("id, user_types(type_name)")
        .eq("id", targetUserId)
        .single();

      if (targetError && targetError.code !== "PGRST116") {
        console.error("[delete-user-full] target lookup failed", targetError);
        return jsonResponse({ error: "Failed to fetch target profile" }, 500);
      }

      if (!targetProfile) {
        return jsonResponse({ error: "User not found" }, 404);
      }

      targetType = targetProfile.user_types?.type_name ?? "guest";
      if (targetType === "owner" && requesterType !== "owner") {
        return jsonResponse({ error: "Only an owner can delete an owner" }, 403);
      }
    }

    const rpcClient = getRpcClient(token);

    const { data, error } = await rpcClient.rpc("admin_delete_user_full", {
      p_user_id: targetUserId,
    });

    if (error || data?.error) {
      console.error("[delete-user-full] rpc error", error || data?.error);
      return jsonResponse({ error: error?.message || data?.error || "Deletion failed" }, 500);
    }

    return jsonResponse({ success: true, userId: targetUserId, deletedBy: session.user.id, targetType });
  } catch (error) {
    console.error("[delete-user-full] unexpected error", error);
    return jsonResponse({ error: error?.message ?? "Unexpected error" }, 500);
  }
});
