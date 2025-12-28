import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/*
 * Webhook Central para Receber Pedidos de Marketplaces
 * 
 * Este endpoint recebe webhooks de:
 * - iFood
 * - 99Food
 * - Keeta
 * - Agregadores (Anota AI, Hubster)
 * 
 * URL do Webhook: https://yzvcpfcmfutczrlporjp.supabase.co/functions/v1/marketplace-webhook
 */

interface MarketplaceOrder {
    platform: 'ifood' | '99food' | 'keeta' | 'anotaai' | 'hubster' | 'rappi' | 'other';
    externalId: string;
    customer: {
        name: string;
        phone?: string;
        email?: string;
    };
    items: Array<{
        name: string;
        quantity: number;
        price: number;
        observations?: string;
    }>;
    subtotal: number;
    deliveryFee?: number;
    discount?: number;
    total: number;
    orderType: 'delivery' | 'pickup' | 'dine_in';
    deliveryAddress?: string;
    paymentMethod?: string;
    notes?: string;
}

serve(async (req) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
        const url = new URL(req.url);
        const platform = url.searchParams.get('platform') || 'unknown';
        const restaurantId = url.searchParams.get('restaurant_id');

        // Pegar API key do header para autenticação
        const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');

        console.log('[WEBHOOK] Recebido de:', platform, 'Restaurant:', restaurantId);

        const body = await req.json();

        // Identificar plataforma e processar
        let order: MarketplaceOrder;

        switch (platform.toLowerCase()) {
            case 'ifood':
                order = parseIFoodWebhook(body);
                break;
            case '99food':
                order = parse99FoodWebhook(body);
                break;
            case 'keeta':
                order = parseKeetaWebhook(body);
                break;
            case 'anotaai':
                order = parseAnotaAIWebhook(body);
                break;
            case 'hubster':
                order = parseHubsterWebhook(body);
                break;
            default:
                // Tentar formato genérico
                order = parseGenericWebhook(body, platform);
        }

        // Encontrar restaurantId se não fornecido
        let targetRestaurantId = restaurantId;
        if (!targetRestaurantId && apiKey) {
            // Buscar restaurante pela API key
            const { data: settings } = await supabase
                .from('restaurant_settings')
                .select('restaurant_id')
                .or(`ifood_token.cs.${apiKey},ninefood_token.eq.${apiKey},keeta_token.eq.${apiKey}`)
                .maybeSingle();

            if (settings) {
                targetRestaurantId = settings.restaurant_id;
            }
        }

        if (!targetRestaurantId) {
            // Usar primeiro restaurante como fallback (para demo)
            const { data: firstRestaurant } = await supabase
                .from('restaurants')
                .select('id')
                .limit(1)
                .single();

            targetRestaurantId = firstRestaurant?.id;
        }

        if (!targetRestaurantId) {
            throw new Error('Não foi possível identificar o restaurante');
        }

        // Salvar pedido
        const { data: savedOrder, error } = await supabase
            .from('orders')
            .insert({
                restaurant_id: targetRestaurantId,
                external_id: order.externalId,
                external_platform: order.platform,
                customer_name: order.customer.name,
                customer_phone: order.customer.phone || '',
                customer_email: order.customer.email || '',
                items: order.items,
                subtotal: order.subtotal,
                delivery_fee: order.deliveryFee || 0,
                discount: order.discount || 0,
                total: order.total,
                status: 'pending',
                order_type: order.orderType,
                delivery_address: order.deliveryAddress || null,
                payment_method: order.paymentMethod || 'marketplace',
                notes: order.notes || '',
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error('[WEBHOOK] Erro ao salvar pedido:', error);
            throw new Error(`Erro ao salvar pedido: ${error.message}`);
        }

        console.log('[WEBHOOK] Pedido salvo com sucesso:', savedOrder.id);

        return new Response(
            JSON.stringify({
                success: true,
                orderId: savedOrder.id,
                externalId: order.externalId,
                platform: order.platform,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[WEBHOOK] Erro:', error);
        return new Response(
            JSON.stringify({
                error: error.message || 'Erro ao processar webhook',
                timestamp: new Date().toISOString(),
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

// Parsers para cada plataforma
function parseIFoodWebhook(body: any): MarketplaceOrder {
    return {
        platform: 'ifood',
        externalId: body.orderId || body.id || `IFOOD-${Date.now()}`,
        customer: {
            name: body.customer?.name || 'Cliente iFood',
            phone: body.customer?.phone?.number,
            email: body.customer?.email,
        },
        items: (body.items || []).map((item: any) => ({
            name: item.name,
            quantity: item.quantity || 1,
            price: item.unitPrice || item.price || 0,
            observations: item.observations,
        })),
        subtotal: body.subTotal || body.subtotal || 0,
        deliveryFee: body.delivery?.deliveryFee || body.deliveryFee || 0,
        discount: body.benefits?.reduce((sum: number, b: any) => sum + (b.value || 0), 0) || 0,
        total: body.total?.orderAmount || body.total || 0,
        orderType: body.orderType === 'DELIVERY' ? 'delivery' : 'pickup',
        deliveryAddress: body.delivery?.deliveryAddress ?
            `${body.delivery.deliveryAddress.streetName}, ${body.delivery.deliveryAddress.streetNumber}` : undefined,
        paymentMethod: body.payments?.[0]?.name || 'iFood',
        notes: body.additionalInfo,
    };
}

function parse99FoodWebhook(body: any): MarketplaceOrder {
    return {
        platform: '99food',
        externalId: body.order_id || body.id || `99FOOD-${Date.now()}`,
        customer: {
            name: body.customer?.name || body.user?.name || 'Cliente 99Food',
            phone: body.customer?.phone || body.user?.phone,
        },
        items: (body.items || body.order_items || []).map((item: any) => ({
            name: item.name || item.product_name,
            quantity: item.quantity || 1,
            price: item.unit_price || item.price || 0,
            observations: item.notes,
        })),
        subtotal: body.subtotal || body.items_total || 0,
        deliveryFee: body.delivery_fee || 0,
        total: body.total || body.order_total || 0,
        orderType: body.delivery_type === 'pickup' ? 'pickup' : 'delivery',
        deliveryAddress: body.delivery_address?.full_address,
        paymentMethod: body.payment?.method || '99Food',
        notes: body.notes,
    };
}

function parseKeetaWebhook(body: any): MarketplaceOrder {
    return {
        platform: 'keeta',
        externalId: body.orderId || body.id || `KEETA-${Date.now()}`,
        customer: {
            name: body.customer?.name || 'Cliente Keeta',
            phone: body.customer?.phone,
        },
        items: (body.items || []).map((item: any) => ({
            name: item.name,
            quantity: item.quantity || 1,
            price: item.price || 0,
            observations: item.observations,
        })),
        subtotal: body.subtotal || 0,
        deliveryFee: body.deliveryFee || 0,
        total: body.total || 0,
        orderType: body.type === 'PICKUP' ? 'pickup' : 'delivery',
        deliveryAddress: body.deliveryAddress,
        paymentMethod: body.paymentMethod || 'Keeta',
        notes: body.notes,
    };
}

function parseAnotaAIWebhook(body: any): MarketplaceOrder {
    return {
        platform: 'anotaai',
        externalId: body.pedido_id || body.id || `ANOTAAI-${Date.now()}`,
        customer: {
            name: body.cliente?.nome || 'Cliente Anota AI',
            phone: body.cliente?.telefone,
        },
        items: (body.itens || body.produtos || []).map((item: any) => ({
            name: item.nome || item.name,
            quantity: item.quantidade || item.qty || 1,
            price: item.valor_unitario || item.valor || 0,
            observations: item.observacao,
        })),
        subtotal: body.subtotal || body.valor_produtos || 0,
        deliveryFee: body.taxa_entrega || body.valor_entrega || 0,
        discount: body.desconto || 0,
        total: body.total || body.valor_total || 0,
        orderType: body.tipo === 'retirada' ? 'pickup' : 'delivery',
        deliveryAddress: body.endereco?.completo || body.endereco_entrega,
        paymentMethod: body.forma_pagamento || 'Anota AI',
        notes: body.observacao,
    };
}

function parseHubsterWebhook(body: any): MarketplaceOrder {
    return {
        platform: 'hubster',
        externalId: body.order_id || body.external_id || `HUBSTER-${Date.now()}`,
        customer: {
            name: body.customer?.name || 'Cliente Hubster',
            phone: body.customer?.phone,
            email: body.customer?.email,
        },
        items: (body.items || []).map((item: any) => ({
            name: item.name,
            quantity: item.quantity || 1,
            price: item.unit_price || 0,
            observations: item.instructions,
        })),
        subtotal: body.subtotal || 0,
        deliveryFee: body.delivery_fee || 0,
        discount: body.discount || 0,
        total: body.total || 0,
        orderType: body.fulfillment_type === 'PICKUP' ? 'pickup' : 'delivery',
        deliveryAddress: body.delivery_address?.formatted_address,
        paymentMethod: body.payment?.type || 'Hubster',
        notes: body.notes,
    };
}

function parseGenericWebhook(body: any, platform: string): MarketplaceOrder {
    return {
        platform: 'other',
        externalId: body.id || body.order_id || body.orderId || `${platform.toUpperCase()}-${Date.now()}`,
        customer: {
            name: body.customer?.name || body.cliente?.nome || body.user?.name || 'Cliente',
            phone: body.customer?.phone || body.cliente?.telefone || body.user?.phone,
            email: body.customer?.email || body.cliente?.email,
        },
        items: (body.items || body.itens || body.products || []).map((item: any) => ({
            name: item.name || item.nome || 'Item',
            quantity: item.quantity || item.quantidade || item.qty || 1,
            price: item.price || item.valor || item.unit_price || 0,
            observations: item.observations || item.observacao || item.notes,
        })),
        subtotal: body.subtotal || body.valor_produtos || 0,
        deliveryFee: body.delivery_fee || body.taxa_entrega || body.deliveryFee || 0,
        discount: body.discount || body.desconto || 0,
        total: body.total || body.valor_total || 0,
        orderType: (body.type === 'PICKUP' || body.tipo === 'retirada') ? 'pickup' : 'delivery',
        deliveryAddress: body.delivery_address || body.endereco || body.deliveryAddress,
        paymentMethod: body.payment_method || body.forma_pagamento || body.paymentMethod || platform,
        notes: body.notes || body.observacao || body.observations,
    };
}
