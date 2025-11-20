import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { amount, orderId, cardData } = await req.json()

    console.log('Processando pagamento Cielo:', { amount, orderId })

    // Buscar credenciais Cielo do banco
    const { data: settings, error: settingsError } = await supabaseClient
      .from('restaurant_settings')
      .select('cielo_merchant_id, cielo_merchant_key')
      .single()

    if (settingsError || !settings?.cielo_merchant_id || !settings?.cielo_merchant_key) {
      throw new Error('Credenciais Cielo não configuradas')
    }

    // Construir dados da transação
    const transactionData = {
      MerchantOrderId: orderId,
      Customer: {
        Name: cardData?.holderName || 'Cliente',
      },
      Payment: {
        Type: 'CreditCard',
        Amount: Math.round(amount * 100), // Cielo usa centavos
        Currency: 'BRL',
        Country: 'BRA',
        Installments: cardData?.installments || 1,
        SoftDescriptor: 'Restaurante',
        CreditCard: {
          CardNumber: cardData?.number,
          Holder: cardData?.holderName,
          ExpirationDate: cardData?.expiryDate,
          SecurityCode: cardData?.cvv,
          Brand: cardData?.brand || 'Visa'
        }
      }
    }

    // Chamar API da Cielo
    const cieloResponse = await fetch('https://api.cieloecommerce.cielo.com.br/1/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'MerchantId': settings.cielo_merchant_id,
        'MerchantKey': settings.cielo_merchant_key,
      },
      body: JSON.stringify(transactionData)
    })

    const cieloData = await cieloResponse.json()

    console.log('Resposta Cielo:', cieloData)

    if (!cieloResponse.ok) {
      throw new Error(cieloData.Message || 'Erro na Cielo')
    }

    // Retornar dados do pagamento
    return new Response(
      JSON.stringify({
        success: true,
        transactionId: cieloData.Payment?.PaymentId,
        authorizationCode: cieloData.Payment?.AuthorizationCode,
        status: cieloData.Payment?.Status,
        returnCode: cieloData.Payment?.ReturnCode,
        returnMessage: cieloData.Payment?.ReturnMessage,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Erro no pagamento Cielo:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
