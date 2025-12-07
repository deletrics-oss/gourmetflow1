import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LogicRule {
  id: string;
  trigger: string;
  triggerType: 'contains' | 'exact' | 'regex' | 'startsWith';
  response: string;
  priority: number;
}

interface LogicJson {
  rules: LogicRule[];
  default_reply: string;
}

function matchRule(message: string, rule: LogicRule): boolean {
  const lowerMessage = message.toLowerCase();
  const lowerTrigger = rule.trigger.toLowerCase();

  switch (rule.triggerType) {
    case 'exact':
      return lowerMessage === lowerTrigger;
    case 'startsWith':
      return lowerMessage.startsWith(lowerTrigger);
    case 'regex':
      try {
        return new RegExp(rule.trigger, 'i').test(message);
      } catch {
        return false;
      }
    case 'contains':
    default:
      return lowerMessage.includes(lowerTrigger);
  }
}

function executeLogic(message: string, logicJson: LogicJson): string | null {
  // Sort by priority and find first matching rule
  const sortedRules = [...logicJson.rules].sort((a, b) => a.priority - b.priority);
  
  for (const rule of sortedRules) {
    if (matchRule(message, rule)) {
      return rule.response;
    }
  }
  
  return null;
}

async function getAIResponse(message: string, aiPrompt: string, conversationHistory: string[]): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return "Desculpe, estou com problemas técnicos. Por favor, tente novamente mais tarde.";
  }

  try {
    const messages = [
      { role: "system", content: aiPrompt },
      ...conversationHistory.slice(-10).map((msg, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: msg
      })),
      { role: "user", content: message }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      console.error('AI gateway error:', response.status);
      return "Desculpe, não consegui processar sua mensagem. Por favor, tente novamente.";
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";
  } catch (error) {
    console.error('Error calling AI:', error);
    return "Desculpe, ocorreu um erro ao processar sua mensagem.";
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, message, deviceId, restaurantId } = await req.json();

    console.log('Processing message:', { phone, message, deviceId, restaurantId });

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: 'Phone and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get or create conversation
    let conversationId: string | null = null;
    let targetRestaurantId = restaurantId;

    if (deviceId) {
      // Get device info
      const { data: device } = await supabase
        .from('whatsapp_devices')
        .select('restaurant_id, active_logic_id')
        .eq('id', deviceId)
        .single();

      if (device) {
        targetRestaurantId = device.restaurant_id;

        // Get or create conversation
        const { data: existingConvo } = await supabase
          .from('whatsapp_conversations')
          .select('id, is_paused')
          .eq('device_id', deviceId)
          .eq('contact_phone', phone)
          .single();

        if (existingConvo) {
          conversationId = existingConvo.id;
          
          // If conversation is paused, don't auto-respond
          if (existingConvo.is_paused) {
            // Save incoming message only
            await supabase.from('whatsapp_messages').insert({
              conversation_id: conversationId,
              device_id: deviceId,
              restaurant_id: targetRestaurantId,
              phone_number: phone,
              message_content: message,
              remetente: 'cliente',
              direction: 'incoming',
              is_from_bot: false,
            });

            // Update conversation
            await supabase
              .from('whatsapp_conversations')
              .update({ 
                last_message_at: new Date().toISOString(),
                unread_count: (existingConvo as any).unread_count + 1 || 1
              })
              .eq('id', conversationId);

            return new Response(
              JSON.stringify({ success: true, paused: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          // Create new conversation
          const { data: newConvo } = await supabase
            .from('whatsapp_conversations')
            .insert({
              device_id: deviceId,
              restaurant_id: targetRestaurantId,
              contact_phone: phone,
              last_message_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (newConvo) {
            conversationId = newConvo.id;
          }
        }

        // Get logic config
        if (device.active_logic_id) {
          const { data: logic } = await supabase
            .from('whatsapp_logic_configs')
            .select('*')
            .eq('id', device.active_logic_id)
            .single();

          if (logic && logic.is_active) {
            let response: string | null = null;

            // Execute based on logic type
            if (logic.logic_type === 'json' || logic.logic_type === 'hybrid') {
              response = executeLogic(message, logic.logic_json as LogicJson);
            }

            // If no JSON response and AI is enabled
            if (!response && (logic.logic_type === 'ai' || logic.logic_type === 'hybrid')) {
              // Get conversation history for context
              const { data: history } = await supabase
                .from('whatsapp_messages')
                .select('message_content')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })
                .limit(20);

              const historyMessages = history?.map(h => h.message_content) || [];
              response = await getAIResponse(
                message, 
                logic.ai_prompt || "Você é um assistente virtual prestativo.",
                historyMessages
              );
            }

            // Use default reply if still no response
            if (!response) {
              response = (logic.logic_json as LogicJson).default_reply || "Olá! Como posso ajudar?";
            }

            // Save incoming message
            await supabase.from('whatsapp_messages').insert({
              conversation_id: conversationId,
              device_id: deviceId,
              restaurant_id: targetRestaurantId,
              phone_number: phone,
              message_content: message,
              remetente: 'cliente',
              direction: 'incoming',
              is_from_bot: false,
            });

            // Save bot response
            await supabase.from('whatsapp_messages').insert({
              conversation_id: conversationId,
              device_id: deviceId,
              restaurant_id: targetRestaurantId,
              phone_number: phone,
              message_content: response,
              remetente: 'bot',
              direction: 'outgoing',
              is_from_bot: true,
            });

            // Update conversation
            await supabase
              .from('whatsapp_conversations')
              .update({ last_message_at: new Date().toISOString() })
              .eq('id', conversationId);

            return new Response(
              JSON.stringify({ success: true, response }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
    }

    // Fallback: just save the message without auto-response
    await supabase.from('whatsapp_messages').insert({
      conversation_id: conversationId,
      device_id: deviceId,
      restaurant_id: targetRestaurantId,
      phone_number: phone,
      message_content: message,
      remetente: 'cliente',
      direction: 'incoming',
      is_from_bot: false,
    });

    return new Response(
      JSON.stringify({ success: true, response: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});