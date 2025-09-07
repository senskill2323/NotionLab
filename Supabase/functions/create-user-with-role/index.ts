import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const { email, password, firstName, lastName, userType } = await req.json();
    if (!email || !password || !userType) {
      return new Response(JSON.stringify({
        error: "Email, password, and userType are required"
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 400
      });
    }
    const adminSupabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: userTypeData, error: typeError } = await adminSupabase.from('user_types').select('id').eq('type_name', userType).single();
    if (typeError || !userTypeData) {
      throw new Error(`User type '${userType}' not found.`);
    }
    const { data: { user }, error: createUserError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    });
    if (createUserError) {
      if (createUserError.message.includes("already exists")) {
        return new Response(JSON.stringify({
          error: "Un utilisateur avec cet email existe déjà."
        }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          },
          status: 409
        });
      }
      throw new Error(`Failed to create auth user: ${createUserError.message}`);
    }
    if (!user) throw new Error("User creation did not return a user object.");
    const { error: profileUpdateError } = await adminSupabase.from('profiles').update({
      user_type_id: userTypeData.id,
      first_name: firstName,
      last_name: lastName
    }).eq('id', user.id);
    if (profileUpdateError) {
      await adminSupabase.auth.admin.deleteUser(user.id);
      throw new Error(`Failed to update profile user_type: ${profileUpdateError.message}`);
    }
    return new Response(JSON.stringify({
      message: "User created successfully.",
      user: user
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 201
    });
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
