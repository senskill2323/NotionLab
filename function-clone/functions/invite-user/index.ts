import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAuth, HttpError } from "../_shared/auth.ts";
import { corsHeaders } from "./cors.ts";

function generateTempPassword(length = 20) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*()-_=+";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let result = "";
  for (const byte of bytes) {
    result += alphabet[byte % alphabet.length];
  }
  return result;
}
type InvitePayload = {
  email?: string;
  firstName?: string;
  lastName?: string;
  redirectTo?: string;
};
type ProfileRecord = {
  id: string;
  email: string;
  status: string | null;
  user_type_id: number | null;
  user_types?: {
    type_name: string;
  } | null;
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
}
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const forbiddenStatuses = new Set(["active", "blocked", "archived"]);
const defaultRedirect =
  Deno.env.get("INVITE_REDIRECT_URL") ||
  Deno.env.get("SITE_URL")?.replace(/\/$/, "") + "/connexion" ||
  "https://notionlab.co/connexion";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Configuration manquante (SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY)." }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
  try {
    const auth = await requireAuth(req, { allowedRoles: ["owner", "admin"] });
    const adminSupabase = auth.serviceClient;
    const readerSupabase = auth.anonClient;
    const payload = (await req.json()) as InvitePayload | null;
    const email = payload?.email ? normalizeEmail(payload.email) : null;
    const firstName = payload?.firstName?.trim() || null;
    const lastName = payload?.lastName?.trim() || null;
    const redirectTo = payload?.redirectTo?.trim() || defaultRedirect;
    if (!email) {
      return new Response(JSON.stringify({ error: "L'adresse e-mail est obligatoire." }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
    if (!adminSupabase) {
      throw new Error("Supabase admin client is not configured.");
    }
    const { data: clientType, error: clientTypeError } = await readerSupabase
      .from("user_types")
      .select("id, type_name")
      .eq("type_name", "client")
      .single();
    if (clientTypeError || !clientType) {
      console.error("Client user type not found", clientTypeError);
      return new Response(JSON.stringify({ error: "Type d'utilisateur 'client' introuvable." }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
    const { data: existingProfile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("id, email, status, user_type_id, user_types(type_name)")
      .eq("email", email)
      .maybeSingle<ProfileRecord>();
    if (profileError && profileError.code !== "PGRST116") {
      // PGRST116 indicates no rows returned for maybeSingle
      console.error("Failed to check existing profile", profileError);
      return new Response(JSON.stringify({ error: "Impossible de verifier le profil existant." }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
    if (existingProfile && existingProfile.status && forbiddenStatuses.has(existingProfile.status)) {
      return new Response(JSON.stringify({ error: "Un compte actif existe deja pour cet e-mail." }), {
        status: 409,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
    const inviteResult = await adminSupabase.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    let invitedUser = inviteResult.data?.user;
    let userId = invitedUser?.id || existingProfile?.id;
    let profileStatus = "invited";
    let fallbackDetails: Record<string, unknown> | undefined;

    if (inviteResult.error) {
      const message = inviteResult.error.message || "Echec de l'invitation.";
      const lowered = message.toLowerCase();
      if (lowered.includes("already")) {
        return new Response(JSON.stringify({ error: message }), {
          status: 409,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      console.warn("[invite-user] invite error, falling back to manual creation", inviteResult.error);
      const tempPassword = generateTempPassword();
      const createResponse = await adminSupabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: false,
        user_metadata: {
          first_name: firstName ?? undefined,
          last_name: lastName ?? undefined,
        },
      });

      if (createResponse.error || !createResponse.data?.user) {
        console.error("[invite-user] fallback createUser error", createResponse.error);
        return new Response(JSON.stringify({ error: "Impossible de creer le compte manuellement." }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      invitedUser = createResponse.data.user;
      userId = invitedUser.id;

      let resetEmailSent = true;
      try {
        const resetResponse = await adminSupabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (resetResponse.error) {
          resetEmailSent = false;
          console.warn("[invite-user] fallback resetPasswordForEmail error", resetResponse.error);
        }
      } catch (resetError) {
        resetEmailSent = false;
        console.warn("[invite-user] fallback reset password threw", resetError);
      }

      profileStatus = resetEmailSent ? "invited" : "invited_manual";
      fallbackDetails = {
        method: "manual_create",
        resetEmailSent,
        generatedPassword: resetEmailSent ? undefined : tempPassword,
      };
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Impossible de determiner l'identifiant utilisateur." }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
    const profilePayload = {
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      user_type_id: clientType.id,
      status: profileStatus,
    };
    const { error: upsertError } = await adminSupabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" });
    if (upsertError) {
      console.error("Failed to upsert profile for invited user", upsertError);
      if (fallbackDetails) {
        fallbackDetails.profileUpsertError = upsertError.message || upsertError.code || "RLS blocked profile update";
      } else {
        return new Response(JSON.stringify({ error: "Invitation creee mais echec de la mise a jour du profil." }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }
    }
    const responseBody: Record<string, unknown> = {
      ok: true,
      userId,
      status: profileStatus,
    };
    if (fallbackDetails) {
      responseBody.fallback = fallbackDetails;
    }
    return new Response(JSON.stringify(responseBody), {
      status: 201,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
    console.error("[invite-user] unexpected error", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Unexpected error" }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
