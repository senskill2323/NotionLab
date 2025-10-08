import { corsHeaders } from "./cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const { blockId, metadata, content } = await req.json();
    if (!metadata) {
      return new Response(JSON.stringify({ error: 'Missing metadata payload' }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 400
      });
    }

    const blockData = {
      ...metadata,
      content,
    };

    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    let data, error;
    if (blockId) {
      // Update existing block
      const { data: updateData, error: updateError } = await supabase.from('content_blocks').update(blockData).eq('id', blockId).select().single();
      data = updateData;
      error = updateError;
    } else {
      // Create new block
      const { data: insertData, error: insertError } = await supabase.from('content_blocks').insert(blockData).select().single();
      data = insertData;
      error = insertError;
    }
    if (error) {
      console.error('Content Block management error:', error);
      return new Response(JSON.stringify({
        error: error.message
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 400
      });
    }
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 200
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
