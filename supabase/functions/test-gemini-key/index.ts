import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey } = await req.json();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ valid: false, error: 'API Key não fornecida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Test the API key with a simple request to Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Responda apenas: OK' }] }],
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log('Gemini test response:', text);
      
      return new Response(
        JSON.stringify({ valid: true, message: 'Chave válida!' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      const errorData = await response.text();
      console.error('Gemini API error:', response.status, errorData);
      
      let errorMessage = 'Chave inválida';
      if (response.status === 400) {
        errorMessage = 'Chave API inválida ou malformada';
      } else if (response.status === 403) {
        errorMessage = 'Chave API sem permissão ou desabilitada';
      } else if (response.status === 429) {
        errorMessage = 'Limite de requisições excedido';
      }
      
      return new Response(
        JSON.stringify({ valid: false, error: errorMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    console.error('Error testing Gemini key:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao testar chave';
    return new Response(
      JSON.stringify({ valid: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
