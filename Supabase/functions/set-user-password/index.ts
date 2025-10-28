import { corsHeaders } from "./cors.ts";
import {
  handleHttpError,
  requireAuth,
  type AuthContext,
  HttpError,
} from "../_shared/auth.ts";

const redirectUrl = (() => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (!supabaseUrl) return undefined;
  try {
    const url = new URL(supabaseUrl);
    url.hostname = url.hostname.replace(".co", ".app");
    url.pathname = "/connexion";
    return url.toString();
  } catch {
    return undefined;
  }
})();

function validatePayload(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Invalid JSON payload");
  }
  const { userId, password } = body as Record<string, unknown>;
  if (!userId || typeof userId !== "string") {
    throw new HttpError(400, "User ID is required");
  }
  if (password !== undefined && typeof password !== "string") {
    throw new HttpError(400, "Password must be a string");
  }
  return { userId, password: password as string | undefined };
}

async function resetPassword(
  auth: AuthContext,
  targetUserId: string,
  incomingPassword?: string,
) {
  const allowed = new Set(["owner", "admin"]);
  if (!allowed.has(auth.role)) {
    throw new HttpError(403, "Forbidden");
  }

  if (targetUserId === auth.user.id && !incomingPassword) {
    throw new HttpError(400, "New password required for self-reset");
  }

  const passwordProvided = typeof incomingPassword === "string" && incomingPassword.length > 0;
  let newPassword = incomingPassword;
  if (!newPassword) {
    newPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  }

  const { data: user, error } = await auth.serviceClient.auth.admin
    .updateUserById(targetUserId, { password: newPassword });

  if (error) {
    console.error("[set-user-password] update error", error);
    throw new HttpError(
      500,
      `Failed to update user password: ${error.message}`,
    );
  }

  if (!user?.user?.email) {
    throw new HttpError(500, "User email not found after password update");
  }

  let resetEmailSent = false;
  let resetEmailAttempted = false;
  if (redirectUrl) {
    resetEmailAttempted = true;
    const { error: resetError } = await auth.serviceClient.auth
      .resetPasswordForEmail(user.user.email, { redirectTo: redirectUrl });
    if (resetError) {
      console.warn(
        "[set-user-password] Password reset email failed",
        resetError,
      );
    } else {
      resetEmailSent = true;
    }
  }

  const response: Record<string, unknown> = {
    ok: true,
    userId: targetUserId,
    updatedBy: auth.user.id,
    resetEmail: {
      attempted: resetEmailAttempted,
      sent: resetEmailSent,
    },
  };
  if (!passwordProvided && (!resetEmailAttempted || !resetEmailSent)) {
    response.generatedPassword = newPassword;
  }
  return response;
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
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }

  try {
    const auth = await requireAuth(req, {
      allowedRoles: ["owner", "admin"],
    });

    const body = await req.json().catch(() => {
      throw new HttpError(400, "Invalid JSON payload");
    });

    const { userId, password } = validatePayload(body);

    const result = await resetPassword(auth, userId, password);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return handleHttpError(error, corsHeaders);
  }
});
