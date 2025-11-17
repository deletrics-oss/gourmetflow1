import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { deviceId, status, qr_code, session_name, phone_number } = await req.json();

    console.log(`[whatsapp-sync-device] Atualizando device ${deviceId}: status=${status}`);

    const { error } = await supabase
      .from("whatsapp_devices")
      .update({
        status,
        qr_code: qr_code || null,
        session_name: session_name || null,
        phone_number: phone_number || null,
        updated_at: new Date().toISOString()
      })
      .eq("device_id", deviceId);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[whatsapp-sync-device] Erro:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
