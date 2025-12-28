import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/*
 * Simulador de Pedidos de Marketplace
 * 
 * Cria pedidos de teste para demonstração do sistema
 * Pedidos são marcados com is_test: true
 */

// Nomes brasileiros para teste
const nomesBrasileiros = [
    'Maria Silva', 'João Santos', 'Ana Oliveira', 'Pedro Costa',
    'Juliana Souza', 'Lucas Ferreira', 'Fernanda Lima', 'Ricardo Almeida',
    'Patricia Rodrigues', 'Carlos Pereira', 'Mariana Gomes', 'Bruno Martins'
];

// Endereços brasileiros para teste
const enderecosBrasileiros = [
    'Rua das Flores, 123 - Centro',
    'Av. Brasil, 456 - Jardim América',
    'Rua São Paulo, 789 - Vila Nova',
    'Av. Paulista, 1000 - Bela Vista',
    'Rua Rio de Janeiro, 234 - Centro',
    'Av. Getúlio Vargas, 567 - Industrial',
    'Rua XV de Novembro, 890 - Centro Histórico',
    'Av. Independência, 321 - Liberdade'
];

// Itens de teste por tipo de restaurante
const itensRestaurante = {
    pizzaria: [
        { name: 'Pizza Margherita', price: 45.90 },
        { name: 'Pizza Calabresa', price: 49.90 },
        { name: 'Pizza Portuguesa', price: 52.90 },
        { name: 'Refrigerante 2L', price: 12.00 },
        { name: 'Água Mineral', price: 5.00 },
    ],
    hamburgueria: [
        { name: 'X-Burguer', price: 25.90 },
        { name: 'X-Bacon', price: 29.90 },
        { name: 'X-Tudo', price: 35.90 },
        { name: 'Batata Frita', price: 15.00 },
        { name: 'Milk Shake', price: 18.00 },
    ],
    japones: [
        { name: 'Combo Sushi 20 peças', price: 59.90 },
        { name: 'Hot Roll 10 peças', price: 32.90 },
        { name: 'Temaki Salmão', price: 28.90 },
        { name: 'Yakisoba', price: 35.00 },
        { name: 'Chá Gelado', price: 8.00 },
    ],
    default: [
        { name: 'Prato Executivo', price: 29.90 },
        { name: 'Marmitex Grande', price: 22.00 },
        { name: 'Salada Completa', price: 18.90 },
        { name: 'Suco Natural', price: 10.00 },
        { name: 'Sobremesa do Dia', price: 12.00 },
    ]
};

const formasPagamento = [
    'PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Vale Refeição'
];

function getRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomItems(tipo: string, quantidade: number) {
    const items = itensRestaurante[tipo as keyof typeof itensRestaurante] || itensRestaurante.default;
    const selected = [];

    for (let i = 0; i < quantidade; i++) {
        const item = getRandom(items);
        const qty = Math.floor(Math.random() * 3) + 1;
        selected.push({
            name: item.name,
            quantity: qty,
            price: item.price,
            total: item.price * qty,
            observations: Math.random() > 0.7 ? 'Sem cebola' : null,
        });
    }

    return selected;
}

function generatePhone() {
    const ddd = ['11', '21', '31', '41', '51', '61', '71', '81'][Math.floor(Math.random() * 8)];
    const numero = Math.floor(Math.random() * 900000000) + 100000000;
    return `${ddd}9${numero}`;
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

        const { restaurantId, platform, tipoRestaurante } = await req.json();

        if (!restaurantId) {
            throw new Error('restaurantId é obrigatório');
        }

        console.log('[SIMULATE] Gerando pedido de teste:', { restaurantId, platform, tipoRestaurante });

        // Gerar dados do pedido
        const numItems = Math.floor(Math.random() * 3) + 1;
        const items = getRandomItems(tipoRestaurante || 'default', numItems);
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const deliveryFee = [0, 5.99, 7.99, 9.99][Math.floor(Math.random() * 4)];
        const discount = Math.random() > 0.8 ? Math.floor(subtotal * 0.1) : 0;
        const total = subtotal + deliveryFee - discount;

        const orderType = Math.random() > 0.3 ? 'delivery' : 'pickup';
        const externalId = `TEST-${platform?.toUpperCase() || 'DEMO'}-${Date.now()}`;

        // Criar pedido de teste
        const { data: order, error } = await supabase
            .from('orders')
            .insert({
                restaurant_id: restaurantId,
                external_id: externalId,
                external_platform: platform || 'demo',
                customer_name: getRandom(nomesBrasileiros),
                customer_phone: generatePhone(),
                items: items,
                subtotal: subtotal,
                delivery_fee: deliveryFee,
                discount: discount,
                total: total,
                status: 'pending',
                order_type: orderType,
                delivery_address: orderType === 'delivery' ? getRandom(enderecosBrasileiros) : null,
                payment_method: getRandom(formasPagamento),
                notes: Math.random() > 0.8 ? 'Por favor, entregar no portão' : '',
                is_test: true, // Marcar como pedido de teste
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) {
            console.error('[SIMULATE] Erro ao criar pedido:', error);
            throw new Error(`Erro ao criar pedido: ${error.message}`);
        }

        console.log('[SIMULATE] Pedido de teste criado:', order.id);

        return new Response(
            JSON.stringify({
                success: true,
                message: `Pedido de teste ${platform?.toUpperCase() || 'DEMO'} criado!`,
                order: {
                    id: order.id,
                    externalId: externalId,
                    platform: platform || 'demo',
                    customerName: order.customer_name,
                    total: total,
                    items: items.length,
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[SIMULATE] Erro:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Erro ao simular pedido' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
