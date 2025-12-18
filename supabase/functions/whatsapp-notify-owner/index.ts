import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SERVER_URL = "http://72.60.246.250:3022";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { restaurantId, type, data } = await req.json();

    console.log(`[Notify Owner] Restaurant: ${restaurantId}, Type: ${type}`);

    // Get restaurant settings
    const { data: settings, error: settingsError } = await supabase
      .from("restaurant_settings")
      .select("owner_whatsapp, whatsapp_group_id, notify_owner_new_order, notify_owner_cancellation, notify_owner_complaint, whatsapp_server_url")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (settingsError || !settings) {
      console.log("[Notify Owner] Settings not found");
      return new Response(JSON.stringify({ success: false, reason: "no_settings" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if notification is enabled
    if (type === "new_order" && !settings.notify_owner_new_order) {
      return new Response(JSON.stringify({ success: false, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (type === "cancellation" && !settings.notify_owner_cancellation) {
      return new Response(JSON.stringify({ success: false, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (type === "complaint" && !settings.notify_owner_complaint) {
      return new Response(JSON.stringify({ success: false, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get target phone (owner or group)
    const targetPhone = settings.whatsapp_group_id || settings.owner_whatsapp;
    if (!targetPhone) {
      console.log("[Notify Owner] No owner phone or group configured");
      return new Response(JSON.stringify({ success: false, reason: "no_phone" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get connected device
    const { data: device } = await supabase
      .from("whatsapp_devices")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("connection_status", "connected")
      .maybeSingle();

    if (!device) {
      console.log("[Notify Owner] No connected device");
      return new Response(JSON.stringify({ success: false, reason: "no_device" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build message based on type
    let message = "";
    
    switch (type) {
      case "new_order": {
        const order = data.order;
        const itemsCount = order.items?.length || 0;
        message = `🆕 *NOVO PEDIDO*

📋 #${order.order_number}
👤 ${order.customer_name || "Não identificado"}
📞 ${order.customer_phone || "N/A"}

🛒 ${itemsCount} ${itemsCount === 1 ? "item" : "itens"}
💰 *Total: R$ ${order.total?.toFixed(2) || "0.00"}*

📍 ${order.delivery_type === "delivery" ? "ENTREGA" : order.delivery_type === "pickup" ? "RETIRADA" : "MESA"}

⏰ ${new Date().toLocaleTimeString("pt-BR")}`;
        break;
      }

      case "cancellation": {
        const order = data.order;
        message = `❌ *PEDIDO CANCELADO*

📋 #${order.order_number}
👤 ${order.customer_name || "Não identificado"}

💰 Valor: R$ ${order.total?.toFixed(2) || "0.00"}
📝 Motivo: ${data.reason || "Não informado"}

⏰ ${new Date().toLocaleTimeString("pt-BR")}`;
        break;
      }

      case "complaint": {
        message = `⚠️ *POSSÍVEL RECLAMAÇÃO DETECTADA*

👤 Cliente: ${data.customerName || "Não identificado"}
📞 Telefone: ${data.phone || "N/A"}

💬 Mensagem:
"${data.message}"

🤖 Análise de sentimento detectou insatisfação.
Recomendamos entrar em contato.

⏰ ${new Date().toLocaleTimeString("pt-BR")}`;
        break;
      }

      case "daily_summary": {
        message = `📊 *RESUMO DO DIA*

🛒 Pedidos: ${data.totalOrders || 0}
💰 Faturamento: R$ ${data.totalRevenue?.toFixed(2) || "0.00"}
❌ Cancelamentos: ${data.cancellations || 0}

📈 Ticket Médio: R$ ${data.avgTicket?.toFixed(2) || "0.00"}
🔝 Item mais pedido: ${data.topItem || "N/A"}

⏰ ${new Date().toLocaleDateString("pt-BR")}`;
        break;
      }

      default:
        message = `ℹ️ *NOTIFICAÇÃO*\n\n${JSON.stringify(data, null, 2)}`;
    }

    // Get server URL
    const serverUrl = settings.whatsapp_server_url || DEFAULT_SERVER_URL;

    // Send message
    const response = await fetch(`${serverUrl}/api/messages/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: device.id,
        phone: targetPhone.replace(/\D/g, ""),
        message,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send: ${await response.text()}`);
    }

    console.log(`[Notify Owner] Message sent for ${type}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[Notify Owner] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
