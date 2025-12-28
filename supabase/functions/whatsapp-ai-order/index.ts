import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

interface CartItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { deviceId, restaurantId, phone, message, contactName } = await req.json();

    console.log(`[AI Order] Processing: ${phone} - ${message}`);

    // Get restaurant info
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("name")
      .eq("id", restaurantId)
      .single();

    // Get restaurant settings
    const { data: settings } = await supabase
      .from("restaurant_settings")
      .select("loyalty_enabled, loyalty_points_per_real")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    // Get or create customer
    let { data: customer } = await supabase
      .from("customers")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("phone", phone)
      .maybeSingle();

    if (!customer) {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({
          restaurant_id: restaurantId,
          phone,
          name: contactName || "Cliente WhatsApp",
        })
        .select()
        .single();
      customer = newCustomer;
    }

    // Get or create cart
    let { data: cart } = await supabase
      .from("whatsapp_cart")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .eq("phone", phone)
      .maybeSingle();

    if (!cart) {
      const { data: newCart } = await supabase
        .from("whatsapp_cart")
        .insert({
          restaurant_id: restaurantId,
          phone,
          customer_id: customer?.id,
          items: [],
          conversation_state: "initial",
        })
        .select()
        .single();
      cart = newCart;
    }

    // Get menu items
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select("id, name, price, description, category_id, is_available")
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true);

    // Get categories
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("sort_order");

    // Check for special commands
    const lowerMessage = message.toLowerCase().trim();

    // Handle special commands
    if (lowerMessage === "#cardapio" || lowerMessage.includes("cardápio") || lowerMessage.includes("menu")) {
      const response = await generateMenuResponse(categories || [], menuItems || [], restaurant?.name);
      return new Response(JSON.stringify({ response, action: "menu" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (lowerMessage === "#parar" || lowerMessage.includes("parar de receber") || lowerMessage.includes("não quero mais")) {
      // Add to opt-out
      await supabase
        .from("whatsapp_opt_outs")
        .upsert({
          restaurant_id: restaurantId,
          phone,
          reason: "user_request",
        });

      return new Response(JSON.stringify({
        response: "✅ Você foi removido da nossa lista de mensagens. Não enviaremos mais mensagens promocionais. Se mudar de ideia, é só chamar!",
        action: "opt_out"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (lowerMessage === "#cashback" || lowerMessage.includes("meu cashback") || lowerMessage.includes("meus pontos")) {
      const cashbackInfo = customer?.loyalty_points || 0;
      const cashbackValue = (cashbackInfo * (settings?.loyalty_points_per_real || 0.01)).toFixed(2);

      return new Response(JSON.stringify({
        response: `💰 *Seu Saldo de Fidelidade*\n\n🎯 Pontos: ${cashbackInfo}\n💵 Valor: R$ ${cashbackValue}\n\nVocê pode usar na sua próxima compra!`,
        action: "cashback_info"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (lowerMessage === "#carrinho" || lowerMessage.includes("meu carrinho") || lowerMessage.includes("ver carrinho")) {
      const cartItems = cart?.items as CartItem[] || [];
      if (cartItems.length === 0) {
        return new Response(JSON.stringify({
          response: "🛒 Seu carrinho está vazio!\n\nDigite *#cardapio* para ver nosso menu.",
          action: "cart_empty"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cartResponse = generateCartResponse(cartItems, customer?.loyalty_points || 0);
      return new Response(JSON.stringify({
        response: cartResponse,
        action: "cart_view"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (lowerMessage === "#limpar" || lowerMessage.includes("limpar carrinho")) {
      await supabase
        .from("whatsapp_cart")
        .update({ items: [], conversation_state: "initial", updated_at: new Date().toISOString() })
        .eq("id", cart?.id);

      return new Response(JSON.stringify({
        response: "🗑️ Carrinho limpo!\n\nDigite *#cardapio* para começar um novo pedido.",
        action: "cart_cleared"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (lowerMessage === "#confirmar" || lowerMessage === "confirmar" || lowerMessage.includes("finalizar pedido")) {
      const cartItems = cart?.items as CartItem[] || [];
      if (cartItems.length === 0) {
        return new Response(JSON.stringify({
          response: "⚠️ Seu carrinho está vazio! Adicione itens antes de confirmar.",
          action: "cart_empty"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create the order
      const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const orderNumber = `WA${Date.now().toString().slice(-6)}`;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          order_number: orderNumber,
          customer_id: customer?.id,
          customer_name: customer?.name,
          customer_phone: phone,
          delivery_type: "pickup",
          subtotal,
          total: subtotal,
          status: "new",
          order_source: "whatsapp",
          notes: "Pedido via WhatsApp",
        })
        .select()
        .single();

      if (orderError) {
        console.error("Order error:", orderError);
        throw new Error("Erro ao criar pedido");
      }

      // Create order items
      for (const item of cartItems) {
        await supabase
          .from("order_items")
          .insert({
            order_id: order.id,
            menu_item_id: item.menu_item_id,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            total_price: item.price * item.quantity,
            notes: item.notes,
          });
      }

      // Clear cart
      await supabase
        .from("whatsapp_cart")
        .update({ items: [], conversation_state: "completed", updated_at: new Date().toISOString() })
        .eq("id", cart?.id);

      return new Response(JSON.stringify({
        response: `✅ *Pedido Confirmado!*\n\n📋 Número: *#${orderNumber}*\n💰 Total: R$ ${subtotal.toFixed(2)}\n\n⏱️ Previsão: 30-45 minutos\n\nVocê receberá atualizações do status!\n\nObrigado por pedir no ${restaurant?.name}! 🍴`,
        action: "order_created",
        orderId: order.id,
        orderNumber
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to match menu item by name
    const matchedItem = menuItems?.find(item =>
      item.name.toLowerCase().includes(lowerMessage) ||
      lowerMessage.includes(item.name.toLowerCase())
    );

    if (matchedItem) {
      // Add to cart
      const cartItems = cart?.items as CartItem[] || [];
      const existingIndex = cartItems.findIndex(i => i.menu_item_id === matchedItem.id);

      if (existingIndex >= 0) {
        cartItems[existingIndex].quantity += 1;
      } else {
        cartItems.push({
          menu_item_id: matchedItem.id,
          name: matchedItem.name,
          quantity: 1,
          price: matchedItem.price,
        });
      }

      await supabase
        .from("whatsapp_cart")
        .update({ items: cartItems, conversation_state: "selecting", updated_at: new Date().toISOString() })
        .eq("id", cart?.id);

      const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      return new Response(JSON.stringify({
        response: `✅ *${matchedItem.name}* adicionado!\n\n🛒 *Seu Carrinho:*\n${cartItems.map(i => `• ${i.quantity}x ${i.name} - R$ ${(i.price * i.quantity).toFixed(2)}`).join('\n')}\n\n💰 *Total: R$ ${total.toFixed(2)}*\n\n➕ Adicione mais itens ou digite *#confirmar* para finalizar`,
        action: "item_added"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI for natural conversation
    const aiResponse = await generateAIResponse(
      message,
      restaurant?.name || "Restaurante",
      categories || [],
      menuItems || [],
      cart?.items as CartItem[] || [],
      customer?.name || contactName,
      customer?.loyalty_points || 0
    );

    return new Response(JSON.stringify({ response: aiResponse, action: "ai_response" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[AI Order] Error:", error);
    return new Response(JSON.stringify({
      error: error.message,
      response: "Desculpe, tive um problema ao processar sua mensagem. Tente novamente ou digite *#cardapio* para ver nosso menu."
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateMenuResponse(categories: any[], menuItems: any[], restaurantName?: string): string {
  let response = `🍴 *Cardápio ${restaurantName || ''}*\n\n`;

  for (const category of categories) {
    const items = menuItems.filter(item => item.category_id === category.id);
    if (items.length === 0) continue;

    response += `*${category.name.toUpperCase()}*\n`;
    for (const item of items) {
      response += `• ${item.name} - R$ ${item.price.toFixed(2)}\n`;
    }
    response += '\n';
  }

  response += `\n💬 Digite o nome do item para adicionar ao carrinho\n`;
  response += `🛒 *#carrinho* - Ver carrinho\n`;
  response += `✅ *#confirmar* - Finalizar pedido`;

  return response;
}

function generateCartResponse(items: CartItem[], loyaltyPoints: number): string {
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  let response = `🛒 *Seu Carrinho*\n\n`;

  for (const item of items) {
    response += `• ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
  }

  response += `\n💰 *Total: R$ ${total.toFixed(2)}*\n`;

  if (loyaltyPoints > 0) {
    response += `🎁 Você tem ${loyaltyPoints} pontos de fidelidade!\n`;
  }

  response += `\n➕ Continue adicionando ou digite *#confirmar*\n`;
  response += `🗑️ *#limpar* - Limpar carrinho`;

  return response;
}

async function generateAIResponse(
  message: string,
  restaurantName: string,
  categories: any[],
  menuItems: any[],
  cartItems: CartItem[],
  customerName: string,
  loyaltyPoints: number
): Promise<string> {
  if (!GEMINI_API_KEY) {
    return `Olá! Sou o assistente do ${restaurantName}.\n\nDigite *#cardapio* para ver nosso menu completo.`;
  }

  const menuSummary = menuItems.slice(0, 20).map(i => `${i.name}: R$ ${i.price.toFixed(2)}`).join(", ");
  const cartSummary = cartItems.length > 0
    ? cartItems.map(i => `${i.quantity}x ${i.name}`).join(", ")
    : "vazio";

  const systemPrompt = `Você é um assistente virtual amigável do restaurante "${restaurantName}".
Seu objetivo é ajudar clientes a fazer pedidos via WhatsApp.

INFORMAÇÕES:
- Nome do cliente: ${customerName}
- Pontos de fidelidade: ${loyaltyPoints}
- Carrinho atual: ${cartSummary}
- Alguns itens do menu: ${menuSummary}

COMANDOS QUE O CLIENTE PODE USAR:
- #cardapio - Ver menu completo
- #carrinho - Ver carrinho
- #confirmar - Finalizar pedido
- #limpar - Limpar carrinho
- #cashback - Ver pontos

INSTRUÇÕES:
- Seja educado, simpático e use emojis
- Respostas curtas e diretas
- Se o cliente quiser pedir algo, sugira que digite o nome do item
- NUNCA invente preços ou itens
- Se não souber algo, sugira #cardapio`;

  try {
    const geminiContents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Entendido! Vou ajudar os clientes com seus pedidos." }] },
      { role: "user", parts: [{ text: message }] }
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Gemini API error");
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || `Olá ${customerName}! Como posso ajudar?`;
  } catch (error) {
    console.error("Gemini AI error:", error);
    return `Olá ${customerName}! 👋\n\nComo posso ajudar?\n\n📋 *#cardapio* - Ver menu\n🛒 *#carrinho* - Ver carrinho\n💰 *#cashback* - Seus pontos`;
  }
}
