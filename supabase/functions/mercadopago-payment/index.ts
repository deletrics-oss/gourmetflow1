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

    console.log('[MERCADOPAGO] Criando pagamento:', { amount, orderId, paymentMethod });

    // Buscar credenciais
    const { data: settings } = await supabaseClient
      .from('restaurant_settings')
      .select('mercadopago_access_token')
      .single();

    if (!settings?.mercadopago_access_token) {
      throw new Error('Mercado Pago não configurado');
    }

    // Criar pagamento via API do Mercado Pago
    const paymentData = {
      transaction_amount: amount,
      description: `Pedido #${orderId}`,
      payment_method_id: paymentMethod === 'pix' ? 'pix' : 'credit_card',
      payer: {
        email: customerEmail || 'cliente@email.com',
      },
    };

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.mercadopago_access_token}`,
      },
      body: JSON.stringify(paymentData),
    });

    const result = await response.json();
    console.log('[MERCADOPAGO] Resposta:', result);

    if (!response.ok) {
      throw new Error(result.message || 'Erro ao criar pagamento');
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
    console.error('[MERCADOPAGO] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao processar pagamento Mercado Pago' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
