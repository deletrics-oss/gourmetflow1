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
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;

    const { data: restaurant, error: restaurantError } = await supabase
      .from("user_restaurants")
      .select("restaurant_id, restaurants(name)")
      .eq("user_id", userData.user.id)
      .eq("is_active", true)
      .single();

    if (restaurantError) throw restaurantError;

    const { data: existingDevice } = await supabase
      .from("whatsapp_devices")
      .select("*")
      .eq("restaurant_id", restaurant.restaurant_id)
      .single();

    if (existingDevice) {
      return new Response(
        JSON.stringify({ error: "Restaurante já possui um dispositivo WhatsApp configurado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deviceId = `rest-${restaurant.restaurant_id.substring(0, 8)}-${Date.now()}`;

    console.log(`[whatsapp-create-device] Criando device ${deviceId} para restaurante ${restaurant.restaurant_id}`);

    const { data: device, error: deviceError } = await supabase
      .from("whatsapp_devices")
      .insert({
        restaurant_id: restaurant.restaurant_id,
        device_id: deviceId,
        status: "INITIALIZING"
      })
      .select()
      .single();

    if (deviceError) throw deviceError;

    const whatsappServerUrl = Deno.env.get("WHATSAPP_SERVER_URL") || "http://72.60.246.250:3022";
    
    const nodeResponse = await fetch(`${whatsappServerUrl}/api/sessions`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        sessionId: deviceId,
        restaurantId: restaurant.restaurant_id 
      })
    });

    if (!nodeResponse.ok) {
      const errorText = await nodeResponse.text();
      throw new Error(`Erro ao iniciar sessão no WhatsApp: ${errorText}`);
    }

    console.log(`[whatsapp-create-device] Sessão iniciada com sucesso no Node.js`);

    return new Response(JSON.stringify({ success: true, device }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[whatsapp-create-device] Erro:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
