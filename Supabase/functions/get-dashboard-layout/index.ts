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
    const { owner_type, owner_id } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    let query = supabase.from("dashboard_layouts").select("layout_json");
    if (owner_type === 'default') {
      query = query.eq('owner_type', 'default').is('owner_id', null);
    } else {
      query = query.eq('owner_type', owner_type).eq('owner_id', owner_id);
    }
    const { data, error } = await query.single();
    if (error) {
      if (error.code === 'PGRST116') {
        return new Response(JSON.stringify({
          layout_json: null
        }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          },
          status: 200
        });
      }
      throw error;
    }
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
    });
  } catch (error) {
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
