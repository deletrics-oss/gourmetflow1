import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WHATSAPP-SEND-MASS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id });

    const { customers, message, deviceId } = await req.json();
    
    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      throw new Error("No customers provided");
    }
    if (!message) {
      throw new Error("No message provided");
    }

    logStep("Request parsed", { customerCount: customers.length, hasDeviceId: !!deviceId });

    // Get WhatsApp server config
    const whatsappServerUrl = Deno.env.get("WHATSAPP_SERVER_URL");
    const whatsappServerUser = Deno.env.get("WHATSAPP_SERVER_USER");
    const whatsappServerPassword = Deno.env.get("WHATSAPP_SERVER_PASSWORD");

    if (!whatsappServerUrl || !whatsappServerUser || !whatsappServerPassword) {
      throw new Error("WhatsApp server configuration missing");
    }

    logStep("WhatsApp server config loaded");

    // Authenticate with WhatsApp server
    const authResponse = await fetch(`${whatsappServerUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: whatsappServerUser,
        password: whatsappServerPassword
      })
    });

    if (!authResponse.ok) {
      throw new Error(`WhatsApp server auth failed: ${authResponse.statusText}`);
    }

    const { token: whatsappToken } = await authResponse.json();
    logStep("WhatsApp server authenticated");

    // Send messages to all customers
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const customer of customers) {
      try {
        const phone = customer.phone.replace(/\D/g, ''); // Remove non-digits
        
        const sendResponse = await fetch(`${whatsappServerUrl}/api/send-message`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${whatsappToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phone,
            message,
            deviceId: deviceId || 'default'
          })
        });

        if (sendResponse.ok) {
          successCount++;
          results.push({ customerId: customer.id, phone, success: true });
          logStep("Message sent", { phone, customerId: customer.id });
        } else {
          errorCount++;
          const errorText = await sendResponse.text();
          results.push({ customerId: customer.id, phone, success: false, error: errorText });
          logStep("Failed to send", { phone, error: errorText });
        }

        // Small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({ 
          customerId: customer.id, 
          phone: customer.phone, 
          success: false, 
          error: errorMsg
        });
        logStep("Error sending to customer", { customerId: customer.id, error: errorMsg });
      }
    }

    logStep("Mass send complete", { total: customers.length, success: successCount, errors: errorCount });

    return new Response(JSON.stringify({ 
      success: true,
      totalSent: successCount,
      totalFailed: errorCount,
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
