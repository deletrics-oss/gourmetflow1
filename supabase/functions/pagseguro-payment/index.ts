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

    const { amount, orderId, customerEmail, customerName } = await req.json();

    console.log('[PAGSEGURO] Criando pagamento PIX (API v4):', { amount, orderId });

    // Buscar credenciais (pega o primeiro registro disponível)
    const { data: settings, error: settingsError } = await supabaseClient
      .from('restaurant_settings')
      .select('pagseguro_token, pagseguro_email')
      .limit(1)
      .maybeSingle();

    console.log('[PAGSEGURO] Settings carregados');

    if (settingsError) {
      console.error('[PAGSEGURO] Erro ao buscar settings:', settingsError);
      throw new Error(`Erro ao buscar configurações: ${settingsError.message}`);
    }

    if (!settings?.pagseguro_token) {
      console.error('[PAGSEGURO] Token não configurado');
      throw new Error('PagSeguro não configurado. Configure o token em Configurações → Integrações de Pagamento');
    }

    // Criar cobrança PIX usando API v4 do PagBank
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + 30); // 30 minutos de validade

    const payload = {
      reference_id: orderId || `ORDER-${Date.now()}`,
      customer: {
        name: customerName || 'Cliente',
        email: customerEmail || 'cliente@email.com',
      },
      qr_codes: [{
        amount: {
          value: Math.round(amount * 100), // API v4 usa centavos
        },
        expiration_date: expirationDate.toISOString(),
      }],
    };

    console.log('[PAGSEGURO] Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://api.pagseguro.com/instant-payments/cob', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.pagseguro_token}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('[PAGSEGURO] Resposta status:', response.status);
    console.log('[PAGSEGURO] Resposta:', responseText);

    if (!response.ok) {
      throw new Error(`PagSeguro API error (${response.status}): ${responseText}`);
    }

    const data = JSON.parse(responseText);

    if (!data.qr_codes || !data.qr_codes[0]) {
      throw new Error('Resposta da API não contém QR Code');
    }

    const qrCodeData = data.qr_codes[0];
    
    // Buscar URL da imagem do QR Code
    let qrCodeImageUrl = '';
    if (qrCodeData.links) {
      const qrCodeLink = qrCodeData.links.find((link: any) => 
        link.rel === 'QRCODE.PNG' || link.media === 'image/png'
      );
      if (qrCodeLink) {
        qrCodeImageUrl = qrCodeLink.href;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        gateway: 'pagseguro',
        qrCode: qrCodeImageUrl, // URL da imagem QR Code
        pixCopyPaste: qrCodeData.text, // Código PIX copia e cola real
        transactionId: qrCodeData.id,
        amount: amount,
        expiresAt: expirationDate.toISOString(),
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
