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

    const { orderId, motoboyId } = await req.json();

    console.log(`[Notify Motoboy] Order: ${orderId}, Motoboy: ${motoboyId}`);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items(name, quantity, unit_price, notes)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Get motoboy details
    const { data: motoboy, error: motoboyError } = await supabase
      .from("motoboys")
      .select("*")
      .eq("id", motoboyId)
      .single();

    if (motoboyError || !motoboy || !motoboy.phone) {
      console.log("[Notify Motoboy] Motoboy not found or no phone");
      return new Response(JSON.stringify({ success: false, reason: "no_phone" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get restaurant info
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("name")
      .eq("id", order.restaurant_id)
      .single();

    // Get connected device
    const { data: device } = await supabase
      .from("whatsapp_devices")
      .select("id")
      .eq("restaurant_id", order.restaurant_id)
      .eq("connection_status", "connected")
      .maybeSingle();

    if (!device) {
      console.log("[Notify Motoboy] No connected device");
      return new Response(JSON.stringify({ success: false, reason: "no_device" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get server URL
    let serverUrl = DEFAULT_SERVER_URL;
    const { data: settings } = await supabase
      .from("restaurant_settings")
      .select("whatsapp_server_url")
      .eq("restaurant_id", order.restaurant_id)
      .maybeSingle();
    
    if (settings?.whatsapp_server_url) {
      serverUrl = settings.whatsapp_server_url;
    }

    // Build address string
    let address = "Endereço não informado";
    if (order.delivery_address) {
      const addr = order.delivery_address;
      address = `${addr.street || ""}, ${addr.number || ""} ${addr.complement || ""}\n${addr.neighborhood || ""} - ${addr.city || ""}`;
    }

    // Build items list
    const itemsList = order.order_items?.map((item: any) => 
      `• ${item.quantity}x ${item.name}${item.notes ? ` (${item.notes})` : ""}`
    ).join("\n") || "Itens não disponíveis";

    // Build message
    const message = `🛵 *NOVA ENTREGA - ${restaurant?.name || "Restaurante"}*

📋 *Pedido #${order.order_number}*

👤 *Cliente:* ${order.customer_name || "Não informado"}
📞 *Telefone:* ${order.customer_phone || "Não informado"}

📍 *Endereço de Entrega:*
${address}

🍴 *Itens:*
${itemsList}

💰 *Total:* R$ ${order.total?.toFixed(2) || "0.00"}

⚠️ Confirme o recebimento respondendo *OK*`;

    // Send message
    const response = await fetch(`${serverUrl}/api/messages/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: device.id,
        phone: motoboy.phone.replace(/\D/g, ""),
        message,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send: ${await response.text()}`);
    }

    console.log(`[Notify Motoboy] Message sent to ${motoboy.name}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[Notify Motoboy] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
