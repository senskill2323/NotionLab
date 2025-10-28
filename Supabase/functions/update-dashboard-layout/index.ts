import { corsHeaders } from "./cors.ts";
import {
  handleHttpError,
  requireAuth,
  HttpError,
} from "../_shared/auth.ts";

type LayoutUpdateRequest = {
  owner_type: string;
  owner_id?: string | null;
  layout_json: unknown;
};

function parseBody(body: unknown): LayoutUpdateRequest {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Invalid JSON payload");
  }

  const {
    owner_type,
    owner_id,
    layout_json,
  } = body as Record<string, unknown>;

  if (typeof owner_type !== "string" || owner_type.length === 0) {
    throw new HttpError(400, "owner_type is required");
  }

  if (
    owner_id !== undefined &&
    owner_id !== null &&
    typeof owner_id !== "string"
  ) {
    throw new HttpError(400, "owner_id must be a string or null");
  }

  if (layout_json === undefined) {
    throw new HttpError(400, "layout_json is required");
  }

  let clonedLayout: unknown;
  try {
    clonedLayout = JSON.parse(JSON.stringify(layout_json));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new HttpError(400, `Invalid layout_json payload: ${reason}`);
  }

  return {
    owner_type,
    owner_id: owner_id === undefined ? null : owner_id as string | null,
    layout_json: clonedLayout,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const auth = await requireAuth(req, { allowedRoles: ["owner"] });
    const body = await req.json().catch(() => {
      throw new HttpError(400, "Invalid JSON payload");
    });
    const payload = parseBody(body);

    const actingUserId = auth.user.id;
    const isDefaultLayout = payload.owner_type === "default";
    const targetOwnerId = isDefaultLayout ? null : (payload.owner_id ?? actingUserId);

    if (!isDefaultLayout && targetOwnerId !== actingUserId) {
      throw new HttpError(403, "Forbidden: mismatched owner");
    }

    let deleteQuery = auth.anonClient
      .from("dashboard_layouts")
      .delete()
      .eq("owner_type", payload.owner_type);

    if (isDefaultLayout) {
      deleteQuery = deleteQuery.is("owner_id", null);
    } else {
      deleteQuery = deleteQuery.eq("owner_id", actingUserId);
    }

    const { error: deleteError } = await deleteQuery;
    if (
      deleteError &&
      deleteError.code !== "PGRST116" &&
      !deleteError.message?.includes("No rows found")
    ) {
      console.error("[update-dashboard-layout] delete error", deleteError);
      throw new HttpError(500, deleteError.message ?? "Failed to clear layout");
    }

    const { data, error: insertError } = await auth.anonClient
      .from("dashboard_layouts")
      .insert({
        owner_type: payload.owner_type,
        owner_id: isDefaultLayout ? null : actingUserId,
        layout_json: payload.layout_json,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("[update-dashboard-layout] insert error", insertError);
      throw new HttpError(500, insertError.message ?? "Failed to save layout");
    }

    return new Response(JSON.stringify(data ?? null), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleHttpError(error, corsHeaders);
  }
});
