import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { amount, orderId, cardData } = await req.json();

    console.log('[STONE] Criando pagamento:', { amount, orderId });

    // Buscar credenciais
    const { data: settings } = await supabaseClient
      .from('restaurant_settings')
      .select('stone_merchant_id, stone_api_key')
      .single();

    if (!settings?.stone_merchant_id || !settings?.stone_api_key) {
      throw new Error('Stone não configurada');
    }

    // Criar transação via API da Stone
    const transactionData = {
      amount: Math.round(amount * 100), // Centavos
      payment_method: 'credit_card',
      card: {
        number: cardData?.number || '4111111111111111',
        holder_name: cardData?.holderName || 'CLIENTE TESTE',
        exp_month: cardData?.expMonth || 12,
        exp_year: cardData?.expYear || 2028,
        cvv: cardData?.cvv || '123',
      },
      customer: {
        name: 'Cliente',
        email: 'cliente@email.com',
      },
      merchant_id: settings.stone_merchant_id,
      description: `Pedido #${orderId}`,
    };

    const response = await fetch('https://api.stone.com.br/v1/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.stone_api_key}`,
      },
      body: JSON.stringify(transactionData),
    });

    const result = await response.json();
    console.log('[STONE] Resposta:', result);

    if (!response.ok) {
      throw new Error(result.message || 'Erro ao processar pagamento');
    }

    return new Response(
      JSON.stringify({
        success: true,
        gateway: 'stone',
        transactionId: result.id || result.charge_id,
        status: result.status,
        amount: amount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[STONE] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao processar pagamento Stone' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
