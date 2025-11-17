import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;

    const { phone, message, deviceId } = await req.json();

    if (!phone || !message) {
      throw new Error("Phone and message are required");
    }

    // Enviar para o servidor WhatsApp externo
    const whatsappServerUrl = Deno.env.get("WHATSAPP_SERVER_URL");
    const whatsappUser = Deno.env.get("WHATSAPP_SERVER_USER");
    const whatsappPassword = Deno.env.get("WHATSAPP_SERVER_PASSWORD");

    if (!whatsappServerUrl) {
      throw new Error("WhatsApp server URL not configured");
    }

    // Login no servidor WhatsApp
    const loginResponse = await fetch(`${whatsappServerUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: whatsappUser,
        password: whatsappPassword
      })
    });

    if (!loginResponse.ok) {
      throw new Error("Failed to authenticate with WhatsApp server");
    }

    // Enviar mensagem
    const sendResponse = await fetch(`${whatsappServerUrl}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: deviceId || "default",
        number: phone.replace(/\D/g, ''),
        message: message
      })
    });

    const result = await sendResponse.json();

    if (!sendResponse.ok) {
      throw new Error(result.message || "Failed to send WhatsApp message");
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending WhatsApp:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
