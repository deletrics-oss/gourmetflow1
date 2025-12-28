import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let body;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      body = await req.text();
      try {
        body = JSON.parse(body);
      } catch {
        // Keep as text
      }
    }

    console.log("Webhook received:", JSON.stringify(body));

    // Extract phone and message (supports Twilio and Meta/WhatsApp formats)
    let phone_number = "";
    let message = "";

    if ("Body" in body && "From" in body) {
      // Twilio format
      message = body.Body;
      phone_number = body.From;
    } else if (body.entry && Array.isArray(body.entry)) {
      // Meta/WhatsApp format
      try {
        const msgObj = body.entry[0].changes[0].value.messages[0];
        phone_number = msgObj.from;
        message = msgObj.text?.body || "";
      } catch (e) {
        console.error("Error parsing Meta format:", e);
      }
    } else {
      // Custom format
      phone_number = body.phone_number || "";
      message = body.message || "";
    }

    if (!phone_number || !message) {
      return new Response(
        JSON.stringify({ error: "Missing phone or message" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save user message
    const { error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert({
        phone_number,
        message_content: message,
        remetente: "usuário",
        message_type: "texto",
        processado: false,
      });

    if (insertError) {
      console.error("Error inserting message:", insertError);
      return new Response(
        JSON.stringify({ error: "Database error" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get restaurant settings
    const { data: settings } = await supabase
      .from("restaurant_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    // Get recent message history
    const { data: messageHistory } = await supabase
      .from("whatsapp_messages")
      .select("message_content, remetente")
      .eq("phone_number", phone_number)
      .order("received_at", { ascending: false })
      .limit(20);

    // Build system prompt
    const systemPrompt = `Você é um assistente virtual do restaurante ${settings?.name || "nosso restaurante"}.
Telefone: ${settings?.phone || "não informado"}
Endereço: ${settings?.street || ""} ${settings?.number || ""}, ${settings?.neighborhood || ""}, ${settings?.city || ""} - ${settings?.state || ""}

Você deve:
- Ser educado e profissional
- Responder dúvidas sobre o cardápio
- Ajudar com pedidos
- Fornecer informações sobre horários e localização
- Manter respostas curtas e diretas`;

    const userMessages = (messageHistory || []).reverse().map(m => ({
      role: m.remetente === "assistente" ? "assistant" : "user",
      content: m.message_content,
    }));

    // Call Gemini AI
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    // Build messages for Gemini format
    const geminiContents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Entendido! Estou pronto para ajudar." }] },
      ...userMessages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    ];

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: {
            maxOutputTokens: 512,
            temperature: 0.7,
          },
        }),
      }
    );

    const aiData = await aiResponse.json();
    const aiMessage = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não entendi.";

    // Save AI response
    await supabase
      .from("whatsapp_messages")
      .insert({
        phone_number,
        message_content: aiMessage,
        remetente: "assistente",
        message_type: "texto",
        ai_response: JSON.stringify(aiData),
        processado: true,
      });

    // Return TwiML for Twilio
    const twiml = `<Response><Message>${aiMessage}</Message></Response>`;

    return new Response(twiml, {
      headers: { ...corsHeaders, "Content-Type": "application/xml" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
