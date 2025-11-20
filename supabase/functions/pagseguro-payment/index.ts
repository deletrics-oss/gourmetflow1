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

    console.log('[PAGSEGURO] Criando pagamento:', { amount, orderId });

    // Buscar credenciais
    const { data: settings } = await supabaseClient
      .from('restaurant_settings')
      .select('pagseguro_token, pagseguro_email')
      .single();

    if (!settings?.pagseguro_token || !settings?.pagseguro_email) {
      throw new Error('PagSeguro não configurado');
    }

    // Criar transação PIX no PagSeguro (API v2)
    const formData = new URLSearchParams({
      email: settings.pagseguro_email,
      token: settings.pagseguro_token,
      paymentMethod: 'pix',
      currency: 'BRL',
      itemId1: orderId || '1',
      itemDescription1: `Pedido #${orderId}`,
      itemAmount1: amount.toFixed(2),
      itemQuantity1: '1',
      senderEmail: customerEmail || 'cliente@email.com',
      senderName: 'Cliente',
    });

    const response = await fetch('https://ws.pagseguro.uol.com.br/v2/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const xmlText = await response.text();
    console.log('[PAGSEGURO] Resposta:', xmlText);

    // Parse XML para extrair código da transação
    const codeMatch = xmlText.match(/<code>(.*?)<\/code>/);
    const transactionCode = codeMatch ? codeMatch[1] : null;

    if (!transactionCode) {
      throw new Error('Erro ao criar transação PagSeguro');
    }

    // Gerar link do QR Code PIX
    const pixQrCode = `https://pagseguro.uol.com.br/checkout/pix/${transactionCode}`;
    
    // Formato PIX copia e cola (simulado)
    const pixCopyPaste = `00020126580014br.gov.bcb.pix0136${transactionCode}@pagseguro.com520400005303986540${amount.toFixed(2)}5802BR6014PagSeguro6009Sao Paulo62070503***`;

    return new Response(
      JSON.stringify({
        success: true,
        gateway: 'pagseguro',
        qrCode: pixQrCode,
        pixCopyPaste: pixCopyPaste,
        transactionId: transactionCode,
        amount: amount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('[PAGSEGURO] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao processar pagamento PagSeguro' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
