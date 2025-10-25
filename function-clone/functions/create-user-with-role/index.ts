import { corsHeaders } from "./cors.ts";
import {
  handleHttpError,
  requireAuth,
  HttpError,
} from "../_shared/auth.ts";

type CreateUserPayload = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  userType: string;
};

function parseBody(body: unknown): CreateUserPayload {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Invalid JSON payload");
  }

  const {
    email,
    password,
    firstName,
    lastName,
    userType,
  } = body as Record<string, unknown>;

  if (typeof email !== "string" || email.length === 0) {
    throw new HttpError(400, "Email is required");
  }

  if (typeof password !== "string" || password.length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters");
  }

  if (typeof userType !== "string" || userType.length === 0) {
    throw new HttpError(400, "userType is required");
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
    userType,
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
    const auth = await requireAuth(req, { allowedRoles: ["owner", "admin"] });
    const body = await req.json().catch(() => {
      throw new HttpError(400, "Invalid JSON payload");
    });
    const payload = parseBody(body);

    if (payload.userType === "owner" && auth.role !== "owner") {
      throw new HttpError(403, "Only an owner can create another owner");
    }

    const { data: userTypeData, error: typeError } = await auth.anonClient
      .from("user_types")
      .select("id, type_name")
      .eq("type_name", payload.userType)
      .single();

    if (typeError || !userTypeData) {
      console.error("[create-user-with-role] user type error", typeError);
      throw new HttpError(
        400,
        `User type '${payload.userType}' not found.`,
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
          first_name: payload.firstName ?? null,
          last_name: payload.lastName ?? null,
        },
      });

    if (createUserError) {
      if (createUserError.message?.includes("already exists")) {
        return new Response(
          JSON.stringify({ error: "Un utilisateur avec cet email existe déjà." }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.error("[create-user-with-role] create error", createUserError);
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
        user_type_id: userTypeData.id,
        first_name: payload.firstName ?? null,
        last_name: payload.lastName ?? null,
      })
      .eq("id", newUser.id);

    if (profileUpdateError) {
      console.error(
        "[create-user-with-role] profile update error",
        profileUpdateError,
      );
      await auth.serviceClient.auth.admin.deleteUser(newUser.id);
      throw new HttpError(
        500,
        `Failed to update profile user_type: ${profileUpdateError.message}`,
      );
    }

    return new Response(
      JSON.stringify({
        message: "User created successfully.",
        user: newUser,
        userType: payload.userType,
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
