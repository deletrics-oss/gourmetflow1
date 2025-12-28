import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/*
 * 99Food API Integration
 * 
 * IMPORTANTE: A 99Food NÃO possui API pública disponível.
 * Esta integração só funcionará se você obtiver credenciais
 * através de uma parceria técnica oficial com a 99Food.
 * 
 * Parceiros homologados: Saipos, Cardápio Web, Menu Integrado, etc.
 * 
 * Para obter credenciais:
 * 1. Entre em contato com seu gerente de conta na 99Food
 * 2. Solicite acesso à API como parceiro técnico
 * 3. Obtenha o token de acesso
 */

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { action, restaurantId, orderId } = await req.json();

        if (!restaurantId) {
            throw new Error('restaurantId é obrigatório');
        }

        console.log('[99FOOD] Action:', action, 'Restaurant:', restaurantId);

        // Buscar credenciais
        const { data: settings } = await supabase
            .from('restaurant_settings')
            .select('ninefood_token')
            .eq('restaurant_id', restaurantId)
            .maybeSingle();

        if (!settings?.ninefood_token) {
            return new Response(
                JSON.stringify({
                    error: 'Token 99Food não configurado',
                    help: 'A 99Food não possui API pública. Entre em contato com seu gerente de conta para solicitar acesso à API como parceiro técnico.',
                    status: 'not_configured',
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const token = settings.ninefood_token;

        switch (action) {
            case 'validate': {
                // Validar se o token funciona
                // NOTA: Endpoint real depende da documentação privada
                return new Response(
                    JSON.stringify({
                        success: true,
                        message: 'Token configurado. A validação real depende da documentação da API privada.',
                        status: 'configured',
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            case 'get_orders': {
                // Buscar pedidos
                // NOTA: Endpoint real depende da documentação privada
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: 'A busca de pedidos requer a documentação oficial da API 99Food',
                        orders: [],
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            default:
                throw new Error(`Ação desconhecida: ${action}`);
        }

    } catch (error: any) {
        console.error('[99FOOD] Erro:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Erro na integração 99Food' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
