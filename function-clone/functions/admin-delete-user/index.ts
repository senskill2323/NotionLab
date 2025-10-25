import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireAuth, handleHttpError, HttpError } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type DeletePayload = {
  userId?: string;
};

function extractAvatarPath(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/");
    const idx = parts.indexOf("avatars");
    if (idx >= 0) {
      return decodeURIComponent(parts.slice(idx + 1).join("/"));
    }
  } catch (_) {
    // ignore – url might already be a path
  }
  const segments = url.split("/");
  return segments[segments.length - 1] || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const auth = await requireAuth(req, {
      requireProfile: true,
    });

    const payload = await req.json().catch(() => ({} as DeletePayload));
    const targetUserId = typeof payload?.userId === "string" ? payload.userId.trim() : "";

    if (!targetUserId) {
      throw new HttpError(400, "Missing or invalid 'userId'");
    }

    const isSelfDeletion = auth.user.id === targetUserId;
    const isPrivileged = auth.role === "owner" || auth.role === "admin";

    if (!isSelfDeletion && !isPrivileged) {
      throw new HttpError(403, "Forbidden");
    }

    const { data: targetProfile, error: targetError } = await auth.anonClient
      .from("profiles")
      .select("id, avatar_url, user_types(type_name)")
      .eq("id", targetUserId)
      .maybeSingle();

    if (targetError && targetError.code !== "PGRST116") {
      console.error("[admin-delete-user] target profile lookup failed", targetError);
      throw new HttpError(500, "Failed to fetch target profile");
    }

    if (!targetProfile) {
      throw new HttpError(404, "User not found");
    }

    const targetType = targetProfile.user_types?.type_name ?? "guest";
    if (!isSelfDeletion && targetType === "owner" && auth.role !== "owner") {
      throw new HttpError(403, "Only an owner can delete an owner");
    }

    const avatarPath = extractAvatarPath(targetProfile.avatar_url ?? null);
    if (avatarPath) {
      const { error: storageError } = await auth.serviceClient
        .storage
        .from("avatars")
        .remove([avatarPath]);
      if (storageError) {
        console.warn("[admin-delete-user] avatar removal failed", storageError);
      }
    }

    const { error: profileDeleteError } = await auth.serviceClient
      .from("profiles")
      .delete()
      .eq("id", targetUserId);
    if (profileDeleteError) {
      console.warn("[admin-delete-user] profile delete failed", profileDeleteError);
    }

    const { error: authDeleteError } = await auth.serviceClient.auth.admin.deleteUser(targetUserId);
    if (authDeleteError) {
      console.error("[admin-delete-user] auth delete failed", authDeleteError);
      throw new HttpError(500, authDeleteError.message || "Failed to delete auth user");
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: targetUserId,
        deletedBy: auth.user.id,
        targetType,
        isSelfDeletion,
      }),
      {
        status: 200,
        headers: corsHeaders,
      },
    );
  } catch (error) {
    return handleHttpError(error, corsHeaders);
  }
});