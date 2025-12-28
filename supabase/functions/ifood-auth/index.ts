import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// iFood API Base URLs
const IFOOD_AUTH_URL = 'https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token';
const IFOOD_API_BASE = 'https://merchant-api.ifood.com.br';

interface AuthResponse {
    accessToken: string;
    type: string;
    expiresIn: number;
}

async function getIFoodCredentials(supabase: any, restaurantId: string) {
    const { data, error } = await supabase
        .from('restaurant_settings')
        .select('ifood_token')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

    if (error || !data?.ifood_token) {
        throw new Error('Credenciais do iFood não configuradas');
    }

    try {
        const credentials = JSON.parse(data.ifood_token);
        if (!credentials.client_id || !credentials.client_secret) {
            throw new Error('Client ID ou Secret não configurados');
        }
        return credentials;
    } catch {
        throw new Error('Formato de credenciais iFood inválido');
    }
}

async function authenticateWithIFood(clientId: string, clientSecret: string): Promise<AuthResponse> {
    const formData = new URLSearchParams();
    formData.append('grantType', 'client_credentials');
    formData.append('clientId', clientId);
    formData.append('clientSecret', clientSecret);

    const response = await fetch(IFOOD_AUTH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[IFOOD-AUTH] Erro:', response.status, errorText);
        throw new Error(`Falha na autenticação iFood: ${response.status}`);
    }

    const data = await response.json();
    return {
        accessToken: data.accessToken,
        type: data.type || 'Bearer',
        expiresIn: data.expiresIn || 3600,
    };
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

        const { action, restaurantId } = await req.json();

        if (!restaurantId) {
            throw new Error('restaurantId é obrigatório');
        }

        console.log('[IFOOD-AUTH] Action:', action, 'Restaurant:', restaurantId);

        // Buscar credenciais
        const credentials = await getIFoodCredentials(supabase, restaurantId);

        switch (action) {
            case 'authenticate':
            case 'get_token': {
                // Autenticar e retornar token
                const auth = await authenticateWithIFood(credentials.client_id, credentials.client_secret);

                // Salvar token no banco para uso futuro
                await supabase
                    .from('restaurant_settings')
                    .update({
                        ifood_access_token: auth.accessToken,
                        ifood_token_expires: new Date(Date.now() + auth.expiresIn * 1000).toISOString(),
                    })
                    .eq('restaurant_id', restaurantId);

                return new Response(
                    JSON.stringify({
                        success: true,
                        accessToken: auth.accessToken,
                        expiresIn: auth.expiresIn,
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            case 'validate': {
                // Validar se as credenciais funcionam
                try {
                    await authenticateWithIFood(credentials.client_id, credentials.client_secret);
                    return new Response(
                        JSON.stringify({ success: true, valid: true, message: 'Credenciais válidas' }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                } catch (e: any) {
                    return new Response(
                        JSON.stringify({ success: false, valid: false, message: e.message }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }
            }

            default:
                throw new Error(`Ação desconhecida: ${action}`);
        }

    } catch (error: any) {
        console.error('[IFOOD-AUTH] Erro:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Erro na autenticação iFood' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
