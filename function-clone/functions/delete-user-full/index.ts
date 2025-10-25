import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";
import { requireAuth, handleHttpError, HttpError } from "../_shared/auth.ts";

type DeletePayload = {
  userId?: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("[delete-user-full] Missing SUPABASE configuration");
}

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
    const auth = await requireAuth(req, {
      allowedRoles: ["owner", "admin"],
      requireProfile: true,
    });

    let payload: DeletePayload = {};
    try {
      if (req.headers.get("Content-Type")?.includes("application/json")) {
        payload = await req.json();
      }
    } catch (_) {
      // ignore malformed body
    }

    const targetUserId = payload.userId ?? auth.user.id;
    if (!targetUserId) {
      throw new HttpError(400, "User id is required");
    }

    const isSelfDeletion = auth.user.id === targetUserId;
    let targetType = auth.role;

    if (!isSelfDeletion) {
      const { data: targetProfile, error: targetError } = await auth.anonClient
        .from("profiles")
        .select("id, user_types(type_name)")
        .eq("id", targetUserId)
        .single();

      if (targetError && targetError.code !== "PGRST116") {
        console.error("[delete-user-full] target lookup failed", targetError);
        throw new HttpError(500, "Failed to fetch target profile");
      }

      if (!targetProfile) {
        throw new HttpError(404, "User not found");
      }

      targetType = targetProfile.user_types?.type_name ?? "guest";
      if (targetType === "owner" && auth.role !== "owner") {
        throw new HttpError(403, "Only an owner can delete an owner");
      }
    }

    const rpcClient = getRpcClient(auth.token);

    const { data, error } = await rpcClient.rpc("admin_delete_user_full", {
      p_user_id: targetUserId,
      p_actor_id: auth.user.id,
    });

    if (error || data?.error) {
      console.error("[delete-user-full] rpc error", error || data?.error);
      throw new HttpError(500, error?.message || data?.error || "Deletion failed");
    }

    return jsonResponse({
      success: true,
      userId: targetUserId,
      deletedBy: auth.user.id,
      targetType,
    });
  } catch (error) {
    return handleHttpError(error, corsHeaders);
  }
});