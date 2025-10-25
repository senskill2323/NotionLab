import { corsHeaders } from "./cors.ts";
import {
  handleHttpError,
  requireAuth,
  HttpError,
} from "../_shared/auth.ts";

function validatePayload(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Invalid JSON payload");
  }

  const {
    filters = {},
    sort = {},
    page,
    perPage,
  } = body as Record<string, unknown>;

  if (typeof sort !== "object" || sort === null) {
    throw new HttpError(400, "Invalid sort payload");
  }

  const { field, dir } = sort as Record<string, unknown>;
  if (typeof field !== "string" || typeof dir !== "string") {
    throw new HttpError(400, "Sort must contain field and dir strings");
  }

  return {
    filters,
    sort: { field, dir },
    page,
    perPage,
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
    const auth = await requireAuth(req, { allowedRoles: ["owner", "admin"] });
    const body = await req.json().catch(() => {
      throw new HttpError(400, "Invalid JSON payload");
    });
    const payload = validatePayload(body);

    const { data, error } = await auth.serviceClient.rpc("search_users", {
      p_filters: payload.filters,
      p_sort_field: payload.sort.field,
      p_sort_dir: payload.sort.dir,
      p_page: payload.page,
      p_per_page: payload.perPage,
    });

    if (error) {
      console.error("[users-search] RPC error", error);
      throw new HttpError(500, error.message ?? "RPC failed");
    }

    return new Response(JSON.stringify(data ?? []), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleHttpError(error, corsHeaders);
  }
});
