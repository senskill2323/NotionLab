import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const { email, password, firstName, lastName } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({
        error: "Email and password are required"
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 400
      });
    }
    const adminSupabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: ownerType, error: typeError } = await adminSupabase.from('user_types').select('id').eq('type_name', 'owner').single();
    if (typeError || !ownerType) {
      throw new Error("Could not find 'owner' user type in the database.");
    }
    const { data: { user: existingUser }, error: getUserError } = await adminSupabase.auth.admin.getUserByEmail(email);
    if (getUserError && getUserError.message !== 'User not found') {
      throw new Error(`Failed to check for user: ${getUserError.message}`);
    }
    if (existingUser) {
      return new Response(JSON.stringify({
        message: "Admin user already exists. No action taken."
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    } else {
      const { data: { user: newUser }, error: createUserError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName || 'Admin',
          last_name: lastName || 'Principal'
        }
      });
      if (createUserError) throw new Error(`Failed to create auth user: ${createUserError.message}`);
      if (!newUser) throw new Error("User creation did not return a user object.");
      // The handle_new_user trigger creates a profile with default 'guest' type. We MUST update it.
      const { error: profileUpdateError } = await adminSupabase.from('profiles').update({
        user_type_id: ownerType.id,
        first_name: firstName || 'Admin',
        last_name: lastName || 'Principal'
      }).eq('id', newUser.id);
      if (profileUpdateError) {
        // If updating profile fails, roll back user creation
        await adminSupabase.auth.admin.deleteUser(newUser.id);
        throw new Error(`Failed to update profile for new admin: ${profileUpdateError.message}`);
      }
      return new Response(JSON.stringify({
        message: "Admin user created successfully.",
        user: newUser
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 201
      });
    }
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
