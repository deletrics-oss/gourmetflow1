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

    const { amount, orderId, paymentMethod, customerEmail } = await req.json();

    console.log('[MERCADOPAGO] Iniciando pagamento:', {
      amount,
      orderId,
      paymentMethod,
      customerEmail,
      timestamp: new Date().toISOString()
    });

    // Buscar credenciais
    const { data: settings, error: settingsError } = await supabaseClient
      .from('restaurant_settings')
      .select('mercadopago_access_token')
      .single();

    console.log('[MERCADOPAGO] Settings response:', { settings, settingsError });

    if (settingsError) {
      console.error('[MERCADOPAGO] Erro ao buscar settings:', settingsError);
      throw new Error(`Erro ao buscar configurações: ${settingsError.message}`);
    }

    if (!settings?.mercadopago_access_token) {
      console.error('[MERCADOPAGO] Token não configurado');
      throw new Error('Mercado Pago não configurado - token ausente');
    }

    // ✅ FASE 4: Validar formato do token
    if (!settings.mercadopago_access_token.startsWith('APP_USR-') && 
        !settings.mercadopago_access_token.startsWith('TEST-')) {
      throw new Error('Token do Mercado Pago inválido - deve começar com APP_USR- ou TEST-');
    }

    // Criar pagamento via API do Mercado Pago
    const paymentData = {
      transaction_amount: amount,
      description: `Pedido #${orderId}`,
      payment_method_id: 'pix', // ✅ FASE 4: Sempre PIX
      payer: {
        email: customerEmail || 'cliente@email.com',
      },
    };

    console.log('[MERCADOPAGO] Enviando para API:', paymentData);

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.mercadopago_access_token}`,
        'X-Idempotency-Key': `${orderId}-${Date.now()}`
      },
      body: JSON.stringify(paymentData),
    });

    const result = await response.json();
    console.log('[MERCADOPAGO] Resposta API:', {
      status: response.status,
      statusText: response.statusText,
      result
    });

    if (!response.ok) {
      const errorMsg = result.message || result.error || 'Erro ao criar pagamento';
      console.error('[MERCADOPAGO] Erro na API:', errorMsg);
      throw new Error(errorMsg);
    }

    // Se for PIX, extrair QR Code
    let qrCodeData = null;
    if (paymentMethod === 'pix' && result.point_of_interaction) {
      qrCodeData = {
        qrCode: result.point_of_interaction.transaction_data.qr_code_base64,
        pixCopyPaste: result.point_of_interaction.transaction_data.qr_code,
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        gateway: 'mercadopago',
        transactionId: result.id,
        status: result.status,
        amount: amount,
        ...qrCodeData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    const errorMessage = error.message || 'Erro ao processar pagamento Mercado Pago';
    console.error('[MERCADOPAGO] Erro fatal:', {
      message: errorMessage,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.toString(),
        timestamp: new Date().toISOString()
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
