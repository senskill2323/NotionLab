import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("ANON_KEY") ??
  "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  "";

const clientConfig = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
} as const;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "[auth-helper] Missing Supabase configuration (SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY)",
  );
}

const inspectorClient = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    ...clientConfig,
    global: {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  })
  : undefined;

export type AuthContext = {
  token: string;
  user: any;
  role: string;
  anonClient: any;
  serviceClient: any;
};

export type RequireAuthOptions = {
  allowedRoles?: string[];
  requireProfile?: boolean;
};

export function extractBearerToken(req: Request): string {
  const header = req.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new HttpError(401, "Missing or invalid authorization header");
  }
  return match[1].trim();
}

function createAnonClient(token: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new HttpError(500, "Supabase anon client misconfigured");
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...clientConfig,
    global: {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

function createServiceClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new HttpError(500, "Supabase service client misconfigured");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    ...clientConfig,
    global: {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  });
}

async function fetchUserProfile(serviceClient: any, userId: string) {
  const { data, error } = await serviceClient
    .from("profiles")
    .select("id, status, user_type_id, user_types(type_name)")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[auth-helper] Failed to load profile", error);
    throw new HttpError(500, "Failed to load profile");
  }

  if (!data) {
    console.warn("[auth-helper] profile lookup returned null", { userId });
  }

  return data ?? null;
}

export async function requireAuth(
  req: Request,
  options: RequireAuthOptions = {},
): Promise<AuthContext> {
  if (!inspectorClient) {
    throw new HttpError(500, "Supabase service client unavailable");
  }

  const token = extractBearerToken(req);

  const { data, error } = await inspectorClient.auth.getUser(token);
  if (error || !data?.user) {
    throw new HttpError(401, "Unauthorized");
  }

  const anonClient = createAnonClient(token);
  const serviceClient = createServiceClient();
  let role = "guest";

  if (options.requireProfile ?? true) {
    const profile = await fetchUserProfile(anonClient, data.user.id);
    if (!profile) {
      console.warn("[auth-helper] profile not found for user", {
        userId: data.user.id,
      });
      throw new HttpError(403, "Profile not found");
    }
    role = profile.user_types?.type_name ?? "guest";
  }

  if (options.allowedRoles && options.allowedRoles.length > 0) {
    if (!options.allowedRoles.includes(role)) {
      throw new HttpError(403, "Forbidden");
    }
  }

  return {
    token,
    user: data.user,
    role,
    anonClient,
    serviceClient,
  };
}

export function handleHttpError(error: unknown, corsHeaders: Record<string, string>) {
  if (error instanceof HttpError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  console.error("[auth-helper] Unexpected error", error);
  return new Response(
    JSON.stringify({ error: "Internal Server Error" }),
    {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}
