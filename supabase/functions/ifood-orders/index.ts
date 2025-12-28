import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IFOOD_API_BASE = 'https://merchant-api.ifood.com.br';

async function getAccessToken(supabase: any, restaurantId: string): Promise<string> {
    // Buscar token salvo
    const { data } = await supabase
        .from('restaurant_settings')
        .select('ifood_access_token, ifood_token_expires, ifood_token')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

    if (!data) {
        throw new Error('Configurações do iFood não encontradas');
    }

    // Verificar se token ainda é válido
    if (data.ifood_access_token && data.ifood_token_expires) {
        const expiresAt = new Date(data.ifood_token_expires);
        if (expiresAt > new Date()) {
            return data.ifood_access_token;
        }
    }

    // Token expirado, renovar
    const credentials = JSON.parse(data.ifood_token);

    const formData = new URLSearchParams();
    formData.append('grantType', 'client_credentials');
    formData.append('clientId', credentials.client_id);
    formData.append('clientSecret', credentials.client_secret);

    const response = await fetch('https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
    });

    if (!response.ok) {
        throw new Error('Falha ao renovar token iFood');
    }

    const auth = await response.json();

    // Salvar novo token
    await supabase
        .from('restaurant_settings')
        .update({
            ifood_access_token: auth.accessToken,
            ifood_token_expires: new Date(Date.now() + auth.expiresIn * 1000).toISOString(),
        })
        .eq('restaurant_id', restaurantId);

    return auth.accessToken;
}

async function getMerchantId(supabase: any, restaurantId: string): Promise<string> {
    const { data } = await supabase
        .from('restaurant_settings')
        .select('ifood_token')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

    if (!data?.ifood_token) {
        throw new Error('Merchant ID não configurado');
    }

    const credentials = JSON.parse(data.ifood_token);
    return credentials.merchant_id;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { action, restaurantId, orderId, reason } = await req.json();

        if (!restaurantId) {
            throw new Error('restaurantId é obrigatório');
        }

        console.log('[IFOOD-ORDERS] Action:', action, 'Restaurant:', restaurantId);

        const accessToken = await getAccessToken(supabase, restaurantId);
        const merchantId = await getMerchantId(supabase, restaurantId);

        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        };

        switch (action) {
            case 'polling': {
                // Buscar eventos de pedidos (polling)
                const response = await fetch(
                    `${IFOOD_API_BASE}/order/v1.0/events:polling`,
                    { method: 'GET', headers }
                );

                if (!response.ok) {
                    throw new Error(`Erro ao buscar eventos: ${response.status}`);
                }

                const events = await response.json();

                // Processar e salvar pedidos no banco
                for (const event of events) {
                    if (event.code === 'PLC' || event.code === 'CFM') {
                        // Novo pedido ou pedido confirmado
                        await processNewOrder(supabase, restaurantId, event, accessToken, headers);
                    }
                }

                // Confirmar que eventos foram processados (acknowledgment)
                if (events.length > 0) {
                    const eventIds = events.map((e: any) => e.id);
                    await fetch(`${IFOOD_API_BASE}/order/v1.0/events/acknowledgment`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(eventIds),
                    });
                }

                return new Response(
                    JSON.stringify({ success: true, events: events.length }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            case 'get_order': {
                // Buscar detalhes de um pedido específico
                if (!orderId) {
                    throw new Error('orderId é obrigatório');
                }

                const response = await fetch(
                    `${IFOOD_API_BASE}/order/v1.0/orders/${orderId}`,
                    { method: 'GET', headers }
                );

                if (!response.ok) {
                    throw new Error(`Erro ao buscar pedido: ${response.status}`);
                }

                const order = await response.json();
                return new Response(
                    JSON.stringify({ success: true, order }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            case 'confirm': {
                // Confirmar pedido (aceitar)
                if (!orderId) {
                    throw new Error('orderId é obrigatório');
                }

                const response = await fetch(
                    `${IFOOD_API_BASE}/order/v1.0/orders/${orderId}/confirm`,
                    { method: 'POST', headers }
                );

                if (!response.ok) {
                    throw new Error(`Erro ao confirmar pedido: ${response.status}`);
                }

                return new Response(
                    JSON.stringify({ success: true, message: 'Pedido confirmado' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            case 'dispatch': {
                // Marcar pedido como saiu para entrega
                if (!orderId) {
                    throw new Error('orderId é obrigatório');
                }

                const response = await fetch(
                    `${IFOOD_API_BASE}/order/v1.0/orders/${orderId}/dispatch`,
                    { method: 'POST', headers }
                );

                if (!response.ok) {
                    throw new Error(`Erro ao despachar pedido: ${response.status}`);
                }

                return new Response(
                    JSON.stringify({ success: true, message: 'Pedido despachado' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            case 'ready': {
                // Marcar pedido como pronto para retirada
                if (!orderId) {
                    throw new Error('orderId é obrigatório');
                }

                const response = await fetch(
                    `${IFOOD_API_BASE}/order/v1.0/orders/${orderId}/readyToPickup`,
                    { method: 'POST', headers }
                );

                if (!response.ok) {
                    throw new Error(`Erro ao marcar como pronto: ${response.status}`);
                }

                return new Response(
                    JSON.stringify({ success: true, message: 'Pedido pronto para retirada' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            case 'cancel': {
                // Cancelar pedido
                if (!orderId) {
                    throw new Error('orderId é obrigatório');
                }

                const response = await fetch(
                    `${IFOOD_API_BASE}/order/v1.0/orders/${orderId}/requestCancellation`,
                    {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({
                            reason: reason || 'INTERNAL_DIFFICULTIES',
                            cancellationCode: '501',
                        })
                    }
                );

                if (!response.ok) {
                    throw new Error(`Erro ao cancelar pedido: ${response.status}`);
                }

                return new Response(
                    JSON.stringify({ success: true, message: 'Cancelamento solicitado' }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            default:
                throw new Error(`Ação desconhecida: ${action}`);
        }

    } catch (error: any) {
        console.error('[IFOOD-ORDERS] Erro:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Erro ao processar pedidos iFood' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

async function processNewOrder(supabase: any, restaurantId: string, event: any, accessToken: string, headers: any) {
    // Buscar detalhes completos do pedido
    const response = await fetch(
        `https://merchant-api.ifood.com.br/order/v1.0/orders/${event.orderId}`,
        { method: 'GET', headers }
    );

    if (!response.ok) {
        console.error('[IFOOD-ORDERS] Erro ao buscar detalhes do pedido:', event.orderId);
        return;
    }

    const orderDetails = await response.json();

    // Mapear para formato do GourmetFlow
    const items = orderDetails.items?.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.unitPrice,
        total: item.totalPrice,
        observations: item.observations,
    })) || [];

    // Calcular totais
    const subtotal = items.reduce((sum: number, item: any) => sum + item.total, 0);
    const deliveryFee = orderDetails.delivery?.deliveryFee || 0;
    const total = subtotal + deliveryFee;

    // Criar pedido no GourmetFlow
    const { error } = await supabase
        .from('orders')
        .insert({
            restaurant_id: restaurantId,
            external_id: event.orderId,
            external_platform: 'ifood',
            customer_name: orderDetails.customer?.name || 'Cliente iFood',
            customer_phone: orderDetails.customer?.phone?.number || '',
            items: items,
            subtotal: subtotal,
            delivery_fee: deliveryFee,
            total: total,
            status: 'pending',
            order_type: orderDetails.orderType === 'DELIVERY' ? 'delivery' : 'pickup',
            delivery_address: orderDetails.delivery?.deliveryAddress ?
                `${orderDetails.delivery.deliveryAddress.streetName}, ${orderDetails.delivery.deliveryAddress.streetNumber} - ${orderDetails.delivery.deliveryAddress.neighborhood}` : null,
            notes: orderDetails.additionalInfo || '',
            payment_method: orderDetails.payments?.[0]?.name || 'iFood',
            created_at: new Date().toISOString(),
        });

    if (error) {
        console.error('[IFOOD-ORDERS] Erro ao salvar pedido:', error);
    } else {
        console.log('[IFOOD-ORDERS] Pedido salvo:', event.orderId);
    }
}
