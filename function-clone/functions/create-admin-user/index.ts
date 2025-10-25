import { corsHeaders } from "./cors.ts";
import {
  handleHttpError,
  requireAuth,
  HttpError,
} from "../_shared/auth.ts";

type CreateAdminPayload = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

function parseBody(body: unknown): CreateAdminPayload {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Invalid JSON payload");
  }

  const {
    email,
    password,
    firstName,
    lastName,
  } = body as Record<string, unknown>;

  if (typeof email !== "string" || email.length === 0) {
    throw new HttpError(400, "Email is required");
  }

  if (typeof password !== "string" || password.length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters");
  }

  if (firstName !== undefined && typeof firstName !== "string") {
    throw new HttpError(400, "firstName must be a string");
  }

  if (lastName !== undefined && typeof lastName !== "string") {
    throw new HttpError(400, "lastName must be a string");
  }

  return {
    email,
    password,
    firstName: firstName as string | undefined,
    lastName: lastName as string | undefined,
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

    const { data: ownerType, error: typeError } = await auth.anonClient
      .from("user_types")
      .select("id")
      .eq("type_name", "owner")
      .single();

    if (typeError || !ownerType) {
      console.error("[create-admin-user] owner type missing", typeError);
      throw new HttpError(500, "Owner user type not found");
    }

    const { data: existingUserResponse, error: getUserError } = await auth
      .serviceClient
      .auth
      .admin
      .getUserByEmail(payload.email);

    if (getUserError && getUserError.message !== "User not found") {
      console.error("[create-admin-user] getUser error", getUserError);
      throw new HttpError(
        500,
        `Failed to check for user: ${getUserError.message}`,
      );
    }

    if (existingUserResponse?.user) {
      return new Response(
        JSON.stringify({
          message: "Admin user already exists. No action taken.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: created, error: createUserError } = await auth
      .serviceClient
      .auth
      .admin
      .createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          first_name: payload.firstName ?? "Admin",
          last_name: payload.lastName ?? "Principal",
        },
      });

    if (createUserError) {
      console.error("[create-admin-user] createUser error", createUserError);
      throw new HttpError(
        500,
        `Failed to create auth user: ${createUserError.message}`,
      );
    }

    const newUser = created?.user;
    if (!newUser) {
      throw new HttpError(500, "User creation did not return a user object");
    }

    const { error: profileUpdateError } = await auth.serviceClient
      .from("profiles")
      .update({
        user_type_id: ownerType.id,
        first_name: payload.firstName ?? "Admin",
        last_name: payload.lastName ?? "Principal",
      })
      .eq("id", newUser.id);

    if (profileUpdateError) {
      console.error(
        "[create-admin-user] profile update error",
        profileUpdateError,
      );
      await auth.serviceClient.auth.admin.deleteUser(newUser.id);
      throw new HttpError(
        500,
        `Failed to update profile for new admin: ${profileUpdateError.message}`,
      );
    }

    return new Response(
      JSON.stringify({
        message: "Admin user created successfully.",
        user: newUser,
        createdBy: auth.user.id,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return handleHttpError(error, corsHeaders);
  }
});
