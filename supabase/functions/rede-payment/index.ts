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

    console.log('[REDE] Criando pagamento:', { amount, orderId });

    // Buscar credenciais
    const { data: settings } = await supabaseClient
      .from('restaurant_settings')
      .select('rede_pv, rede_token')
      .single();

    if (!settings?.rede_pv || !settings?.rede_token) {
      throw new Error('Rede não configurada');
    }

    // Criar transação via API da Rede (e-Rede)
    const transactionData = {
      capture: true,
      kind: 'credit',
      reference: orderId,
      amount: Math.round(amount * 100), // Centavos
      cardNumber: cardData?.number || '4111111111111111',
      cardCvv: cardData?.cvv || '123',
      cardExpirationMonth: cardData?.expMonth || '12',
      cardExpirationYear: cardData?.expYear || '2028',
      cardHolderName: cardData?.holderName || 'CLIENTE TESTE',
    };

    const response = await fetch('https://api.userede.com.br/erede/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.rede_token}`,
      },
      body: JSON.stringify(transactionData),
    });

    const result = await response.json();
    console.log('[REDE] Resposta:', result);

    if (!response.ok) {
      throw new Error(result.message || 'Erro ao processar pagamento');
    }

    return new Response(
      JSON.stringify({
        success: true,
        gateway: 'rede',
        transactionId: result.tid || result.nsu,
        authorizationCode: result.authorizationCode,
        status: result.returnCode === '00' ? 'approved' : 'rejected',
        amount: amount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[REDE] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao processar pagamento Rede' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
