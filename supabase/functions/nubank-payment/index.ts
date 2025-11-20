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

    const { amount, orderId, customerEmail } = await req.json();

    console.log('[NUBANK] Criando pagamento PIX:', { amount, orderId });

    // Buscar credenciais
    const { data: settings } = await supabaseClient
      .from('restaurant_settings')
      .select('nubank_client_id, nubank_client_secret')
      .single();

    if (!settings?.nubank_client_id || !settings?.nubank_client_secret) {
      throw new Error('Nubank não configurado');
    }

    // Obter token de acesso OAuth2
    const authResponse = await fetch('https://api.nubank.com.br/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: settings.nubank_client_id,
        client_secret: settings.nubank_client_secret,
      }),
    });

    const authData = await authResponse.json();
    
    if (!authResponse.ok) {
      throw new Error('Erro ao autenticar com Nubank');
    }

    // Criar cobrança PIX
    const pixData = {
      amount: {
        value: Math.round(amount * 100), // Centavos
        currency: 'BRL',
      },
      description: `Pedido #${orderId}`,
      payer: {
        email: customerEmail || 'cliente@email.com',
      },
      external_id: orderId,
    };

    const pixResponse = await fetch('https://api.nubank.com.br/v1/pix/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.access_token}`,
      },
      body: JSON.stringify(pixData),
    });

    const pixResult = await pixResponse.json();
    console.log('[NUBANK] Resposta:', pixResult);

    if (!pixResponse.ok) {
      throw new Error(pixResult.message || 'Erro ao criar cobrança PIX');
    }

    return new Response(
      JSON.stringify({
        success: true,
        gateway: 'nubank',
        transactionId: pixResult.id,
        qrCode: pixResult.qr_code_url,
        pixCopyPaste: pixResult.qr_code,
        amount: amount,
        expiresAt: pixResult.expires_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[NUBANK] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao processar pagamento Nubank' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
