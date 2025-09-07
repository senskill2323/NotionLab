import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const { filters, sort, page, perPage } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const { data, error } = await supabase.rpc('search_users', {
      p_filters: filters,
      p_sort_field: sort.field,
      p_sort_dir: sort.dir,
      p_page: page,
      p_per_page: perPage
    });
    if (error) {
      console.error('RPC Error:', error);
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
    console.error("Users search error:", error);
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
