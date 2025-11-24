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

    const body = await req.json();
    console.log('[PAGSEGURO-WEBHOOK] Recebido:', body);

    // PagSeguro envia notificationCode nos webhooks
    const { notificationCode } = body;

    if (!notificationCode) {
      return new Response(JSON.stringify({ error: 'Missing notificationCode' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar credenciais
    const { data: settings } = await supabaseClient
      .from('restaurant_settings')
      .select('pagseguro_token, pagseguro_email')
      .single();

    if (!settings?.pagseguro_token) {
      throw new Error('PagSeguro não configurado');
    }

    // Consultar status da transação
    const notificationUrl = `https://ws.pagseguro.uol.com.br/v3/transactions/notifications/${notificationCode}?email=${settings.pagseguro_email}&token=${settings.pagseguro_token}`;
    
    const response = await fetch(notificationUrl);
    const xmlText = await response.text();
    
    console.log('[PAGSEGURO-WEBHOOK] Resposta da transação:', xmlText);

    // Parse XML (simplificado - pode usar lib XML se necessário)
    const statusMatch = xmlText.match(/<status>(.*?)<\/status>/);
    const referenceMatch = xmlText.match(/<reference>(.*?)<\/reference>/);
    
    const status = statusMatch ? parseInt(statusMatch[1]) : null;
    const orderId = referenceMatch ? referenceMatch[1] : null;

    // Status 3 = Pago, 4 = Disponível
    if (status === 3 || status === 4) {
      console.log('[PAGSEGURO-WEBHOOK] Pagamento aprovado! Atualizando pedido:', orderId);

      // Atualizar pedido para completed
      await supabaseClient
        .from('orders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', orderId);

      console.log('[PAGSEGURO-WEBHOOK] ✅ Pedido atualizado com sucesso');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('[PAGSEGURO-WEBHOOK] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
