import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATUS_MESSAGES = {
  'new': '🆕 Seu pedido foi recebido e está sendo preparado!',
  'confirmed': '✅ Pedido confirmado! Estamos preparando com carinho.',
  'preparing': '👨‍🍳 Seu pedido está sendo preparado na cozinha!',
  'ready': '✨ Pedido pronto! Em breve sairá para entrega.',
  'out_for_delivery': '🛵 Pedido saiu para entrega!',
  'completed': '🎉 Pedido entregue! Obrigado pela preferência!',
  'cancelled': '❌ Pedido cancelado.'
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

    const { orderId, status, customerPhone, orderNumber, motoboy } = await req.json();

    if (!orderId || !status || !customerPhone) {
      throw new Error("Missing required fields");
    }

    const whatsappServerUrl = Deno.env.get("WHATSAPP_SERVER_URL");
    const whatsappUser = Deno.env.get("WHATSAPP_SERVER_USER");
    const whatsappPassword = Deno.env.get("WHATSAPP_SERVER_PASSWORD");

    if (!whatsappServerUrl) {
      throw new Error("WhatsApp server not configured");
    }

    // Login
    const loginResponse = await fetch(`${whatsappServerUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: whatsappUser,
        password: whatsappPassword
      })
    });

    if (!loginResponse.ok) {
      throw new Error("Failed to authenticate");
    }

    // Construir mensagem
    let message = `Pedido #${orderNumber}\n\n`;
    message += STATUS_MESSAGES[status as keyof typeof STATUS_MESSAGES] || `Status: ${status}`;
    
    if (motoboy && status === 'out_for_delivery') {
      message += `\n\n🛵 Motoboy: ${motoboy}`;
    }

    // Enviar mensagem
    const sendResponse = await fetch(`${whatsappServerUrl}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: "default",
        number: customerPhone.replace(/\D/g, ''),
        message: message
      })
    });

    if (!sendResponse.ok) {
      throw new Error("Failed to send notification");
    }

    // Registrar no histórico
    await supabaseClient.from('order_status_history').insert({
      order_id: orderId,
      new_status: status,
      customer_notified: true
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
