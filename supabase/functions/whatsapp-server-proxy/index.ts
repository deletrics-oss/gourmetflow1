import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Default server URL - can be configured via:
// 1. WHATSAPP_SERVER_URL secret in Supabase Dashboard
// 2. whatsapp_server_url in restaurant_settings table
// 3. Hardcoded fallback below
const DEFAULT_SERVER_URL = Deno.env.get("WHATSAPP_SERVER_URL") || "https://iapedido.deletrics.site";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, deviceId, restaurantId, phone, message, mediaUrl, caption } = await req.json();

    // Get server URL from restaurant settings or use default
    let serverUrl = DEFAULT_SERVER_URL;
    if (restaurantId) {
      const { data: settings } = await supabase
        .from("restaurant_settings")
        .select("whatsapp_server_url")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (settings?.whatsapp_server_url) {
        serverUrl = settings.whatsapp_server_url;
      }
    }

    console.log(`[WhatsApp Proxy] Action: ${action}, Server: ${serverUrl}`);

    switch (action) {
      case "connect": {
        // Create session and get QR code
        const response = await fetch(`${serverUrl}/api/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId, restaurantId }),
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        // Update device with QR code
        if (data.qrCode) {
          await supabase
            .from("whatsapp_devices")
            .update({
              connection_status: "qr_ready",
              qr_code: data.qrCode,
              updated_at: new Date().toISOString(),
            })
            .eq("id", deviceId);
        }

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "status": {
        // Get session status
        const response = await fetch(`${serverUrl}/api/sessions/${deviceId}/status`);

        if (!response.ok) {
          return new Response(JSON.stringify({ status: "disconnected" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await response.json();

        // Update device status
        await supabase
          .from("whatsapp_devices")
          .update({
            connection_status: data.status,
            phone_number: data.phoneNumber || null,
            qr_code: data.qrCode || null,
            last_connected_at: data.status === "connected" ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", deviceId);

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "send": {
        // Send text message
        const response = await fetch(`${serverUrl}/api/messages/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId, phone, message }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to send: ${error}`);
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "send-media": {
        // Send media message
        const response = await fetch(`${serverUrl}/api/messages/send-media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId, phone, mediaUrl, caption }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to send media: ${error}`);
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "contacts": {
        // List contacts
        const response = await fetch(`${serverUrl}/api/contacts/${deviceId}`);

        if (!response.ok) {
          return new Response(JSON.stringify({ contacts: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "disconnect": {
        // Disconnect session
        const response = await fetch(`${serverUrl}/api/sessions/${deviceId}`, {
          method: "DELETE",
        });

        await supabase
          .from("whatsapp_devices")
          .update({
            connection_status: "disconnected",
            qr_code: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", deviceId);

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reconnect": {
        // Force reconnect
        const response = await fetch(`${serverUrl}/api/sessions/${deviceId}/reconnect`, {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error(`Failed to reconnect: ${response.status}`);
        }

        const data = await response.json();

        if (data.qrCode) {
          await supabase
            .from("whatsapp_devices")
            .update({
              connection_status: "qr_ready",
              qr_code: data.qrCode,
              updated_at: new Date().toISOString(),
            })
            .eq("id", deviceId);
        }

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: any) {
    console.error("[WhatsApp Proxy] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
