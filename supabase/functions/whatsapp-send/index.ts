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

    const { phone, message } = await req.json();

    if (!phone || !message) {
      throw new Error("Phone and message are required");
    }

    console.log("Enviando mensagem para:", phone);

    // Buscar credenciais do Twilio no banco
    const { data: settings, error: settingsError } = await supabaseClient
      .from("restaurant_settings")
      .select("twilio_account_sid, twilio_auth_token, twilio_phone_number")
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error("Erro ao buscar configurações:", settingsError);
      throw new Error("Erro ao buscar configurações do Twilio");
    }

    if (!settings?.twilio_account_sid || !settings?.twilio_auth_token) {
      throw new Error("Credenciais do Twilio não configuradas. Configure na página ZapBot → Settings");
    }

    console.log("Credenciais encontradas, enviando via Twilio...");

    // Formatar número para Twilio WhatsApp
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
    const twilioPhone = formattedPhone.startsWith('whatsapp:') ? formattedPhone : `whatsapp:${formattedPhone}`;
    
    // Formatar número de origem
    const fromPhone = settings.twilio_phone_number?.startsWith('whatsapp:') 
      ? settings.twilio_phone_number 
      : `whatsapp:${settings.twilio_phone_number || '+14155238886'}`;

    console.log("De:", fromPhone, "Para:", twilioPhone);

    // Enviar via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${settings.twilio_account_sid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", twilioPhone);
    formData.append("From", fromPhone);
    formData.append("Body", message);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${settings.twilio_account_sid}:${settings.twilio_auth_token}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const result = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Erro do Twilio:", result);
      throw new Error(result.message || `Twilio error: ${result.code || 'Unknown'}`);
    }

    console.log("Mensagem enviada com sucesso:", result.sid);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro ao enviar WhatsApp:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
