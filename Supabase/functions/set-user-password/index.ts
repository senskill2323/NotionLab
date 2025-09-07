import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    // 1. EXTRACTION DE L'ID UTILISATEUR
    const { userId } = await req.json();
    if (!userId) {
      throw new Error("User ID is required.");
    }
    // 2. CRÉATION DU CLIENT SUPABASE ADMIN
    const adminSupabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    // 3. DÉFINITION DU MOT DE PASSE PAR DÉFAUT
    const defaultPassword = "Password123!";
    // 4. MISE À JOUR DU MOT DE PASSE DE L'UTILISATEUR
    const { data: { user }, error: updateUserError } = await adminSupabase.auth.admin.updateUserById(userId, {
      password: defaultPassword
    });
    if (updateUserError) {
      console.error('Error updating user password:', updateUserError);
      throw new Error(`Failed to update user password: ${updateUserError.message}`);
    }
    if (!user || !user.email) {
      throw new Error("Could not retrieve user email after password update.");
    }
    // 5. ENVOI DE L'EMAIL DE NOTIFICATION
    // Note: l'email de confirmation de changement de mot de passe est souvent envoyé automatiquement par Supabase.
    // Cette étape est une sécurité supplémentaire pour s'assurer que l'utilisateur est notifié.
    const { error: sendEmailError } = await adminSupabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${Deno.env.get("SUPABASE_URL")?.replace('.co', '.app')}/connexion`
    });
    if (sendEmailError) {
      // Log l'erreur mais ne la lance pas, car la mise à jour du mot de passe est l'action principale.
      console.warn(`Password was reset, but failed to send notification email: ${sendEmailError.message}`);
    }
    // 6. RÉPONSE DE SUCCÈS
    return new Response(JSON.stringify({
      message: "Password has been reset successfully. User has been notified."
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Set-user-password function error:", error);
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
