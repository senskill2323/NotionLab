import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const { owner_type, owner_id, layout_json } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    // STRATÉGIE DE CONTOURNEMENT DU TRIGGER : DELETE puis INSERT
    // Cela évite de déclencher le trigger ON UPDATE qui pose problème.
    // 1. Supprimer l'ancienne mise en page s'il en existe une.
    let deleteQuery = supabase.from("dashboard_layouts").delete().eq("owner_type", owner_type);
    if (owner_id) {
      deleteQuery = deleteQuery.eq("owner_id", owner_id);
    } else {
      deleteQuery = deleteQuery.is("owner_id", null);
    }
    const { error: deleteError } = await deleteQuery;
    // On ignore l'erreur si aucune ligne n'a été trouvée pour la suppression, ce qui est normal la première fois.
    if (deleteError && deleteError.code !== 'PGRST116' && !deleteError.message.includes('No rows found')) {
      throw deleteError;
    }
    // 2. Insérer la nouvelle mise en page.
    const { data, error: insertError } = await supabase.from("dashboard_layouts").insert({
      owner_type,
      owner_id: owner_id || null,
      layout_json,
      updated_at: new Date().toISOString()
    }).select().single();
    if (insertError) {
      throw insertError;
    }
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
    console.error("Update-dashboard-layout error:", error);
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
