import { corsHeaders } from "./cors.ts";
import {
  handleHttpError,
  requireAuth,
  HttpError,
} from "../_shared/auth.ts";

type LayoutRequest = {
  owner_type: string;
  owner_id?: string | null;
};

function parseBody(body: unknown): LayoutRequest {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Invalid JSON payload");
  }

  const { owner_type, owner_id } = body as Record<string, unknown>;

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

  return {
    owner_type,
    owner_id: owner_id === undefined ? null : owner_id as string | null,
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
    const auth = await requireAuth(req, {
      allowedRoles: ["owner", "admin", "client", "vip", "prof"],
    });
    const body = await req.json().catch(() => {
      throw new HttpError(400, "Invalid JSON payload");
    });
    const payload = parseBody(body);

    const queryClient = auth.anonClient;
    let query = queryClient
      .from("dashboard_layouts")
      .select("layout_json");

    if (payload.owner_type === "default") {
      query = query.eq("owner_type", "default").is("owner_id", null);
    } else {
      const targetOwnerId = payload.owner_id ?? auth.user.id;
      query = query
        .eq("owner_type", payload.owner_type)
        .eq("owner_id", targetOwnerId);
    }

    const { data, error } = await query.single();
    if (error) {
      if (error.code === "PGRST116") {
        return new Response(
          JSON.stringify({ layout_json: null }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      console.error("[get-dashboard-layout] query error", error);
      throw new HttpError(500, error.message ?? "Failed to fetch layout");
    }

    return new Response(JSON.stringify(data ?? { layout_json: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleHttpError(error, corsHeaders);
  }
});
