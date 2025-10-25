import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const AUTH_SCHEME = /^Bearer\s+/i;

const createErrorResponse = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    status,
  });

const sanitizeObject = (value: unknown, fieldName: string, { allowString = false } = {}): Record<string, unknown> | string => {
  if (allowString && typeof value === "string") return value;
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid ${fieldName} payload`);
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${fieldName} payload: ${reason}`);
  }
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase environment configuration for manage-content-block");
}

const getAuthorizationHeader = (req: Request) => {
  const header = req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  if (!AUTH_SCHEME.test(header)) {
    return null;
  }
  return header;
};

const extractAccessToken = (authorizationHeader: string) =>
  authorizationHeader.replace(AUTH_SCHEME, "").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const authorizationHeader = getAuthorizationHeader(req);
    if (!authorizationHeader) {
      return createErrorResponse("Unauthorized", 401);
    }
    const accessToken = extractAccessToken(authorizationHeader);
    if (!accessToken) {
      return createErrorResponse("Unauthorized", 401);
    }

    const { blockId, metadata, content } = await req.json();
    if (!metadata) {
      return createErrorResponse("Missing metadata payload");
    }

    let sanitizedMetadata: Record<string, unknown>;
    let sanitizedContent: Record<string, unknown> | string;

    try {
      sanitizedMetadata = sanitizeObject(metadata, "metadata") as Record<string, unknown>;
      sanitizedContent = sanitizeObject(content ?? {}, "content", { allowString: true });
    } catch (validationError) {
      const message = validationError instanceof Error ? validationError.message : "Invalid payload";
      return createErrorResponse(message);
    }

    const blockData = {
      ...sanitizedMetadata,
      content: sanitizedContent,
    };

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return createErrorResponse("Server configuration error", 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        headers: {
          Authorization: authorizationHeader,
        },
      },
    });

    const {
      data: { user: authedUser } = { user: null },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !authedUser) {
      console.error("Content block auth error:", authError);
      return createErrorResponse("Unauthorized", 401);
    }

    const { data: isAdmin, error: permissionsError } = await supabase.rpc("is_owner_or_admin", {
      p_user: authedUser.id,
    });

    if (permissionsError) {
      console.error("Content block permission check error:", permissionsError);
      return createErrorResponse("Unable to verify permissions", 500);
    }

    if (!isAdmin) {
      return createErrorResponse("Forbidden", 403);
    }

    let data, error;
    if (blockId) {
      // Update existing block
      const { data: updateData, error: updateError } = await supabase
        .from('content_blocks')
        .update(blockData)
        .eq('id', blockId)
        .select()
        .single();
      data = updateData;
      error = updateError;
    } else {
      const insertedBlockData = {
        ...blockData,
        author_id: blockData.author_id ?? authedUser.id,
      };
      // Create new block
      const { data: insertData, error: insertError } = await supabase
        .from('content_blocks')
        .insert(insertedBlockData)
        .select()
        .single();
      data = insertData;
      error = insertError;
    }
    if (error) {
      console.error('Content Block management error:', error);
      return createErrorResponse(error.message);
    }
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Edge function error:", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return createErrorResponse(message, 500);
  }
});
