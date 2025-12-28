import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/*
 * Keeta API Integration
 * 
 * IMPORTANTE: A Keeta NÃO possui API pública disponível.
 * Esta integração só funcionará se você obtiver credenciais
 * através de uma parceria técnica oficial com a Keeta.
 * 
 * Para obter credenciais:
 * 1. Entre em contato com a Keeta
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

        console.log('[KEETA] Action:', action, 'Restaurant:', restaurantId);

        // Buscar credenciais
        const { data: settings } = await supabase
            .from('restaurant_settings')
            .select('keeta_token')
            .eq('restaurant_id', restaurantId)
            .maybeSingle();

        if (!settings?.keeta_token) {
            return new Response(
                JSON.stringify({
                    error: 'Token Keeta não configurado',
                    help: 'A Keeta não possui API pública. Entre em contato com a Keeta para solicitar acesso à API como parceiro técnico.',
                    status: 'not_configured',
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const token = settings.keeta_token;

        switch (action) {
            case 'validate': {
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
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: 'A busca de pedidos requer a documentação oficial da API Keeta',
                        orders: [],
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            default:
                throw new Error(`Ação desconhecida: ${action}`);
        }

    } catch (error: any) {
        console.error('[KEETA] Erro:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Erro na integração Keeta' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
