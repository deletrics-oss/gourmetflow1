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
    const { imageBase64, imageUrl } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Prepare image content
    let imageContent: { type: string; image_url: { url: string } } | null = null;
    
    if (imageBase64) {
      imageContent = {
        type: "image_url",
        image_url: {
          url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
        }
      };
    } else if (imageUrl) {
      imageContent = {
        type: "image_url",
        image_url: {
          url: imageUrl
        }
      };
    }

    if (!imageContent) {
      throw new Error('Nenhuma imagem fornecida');
    }

    const systemPrompt = `Você é um especialista em extrair informações de cardápios de restaurantes.
Analise a imagem do cardápio e extraia TODOS os itens com seus preços.

REGRAS IMPORTANTES:
1. Identifique categorias (ex: Pizzas, Bebidas, Sobremesas)
2. Para cada item, extraia: nome, preço, descrição (se houver)
3. Preços devem ser números (ex: 35.90, não "R$ 35,90")
4. Se não conseguir identificar o preço, use 0
5. Agrupe itens por categoria quando possível

Retorne APENAS um JSON válido no formato:
{
  "items": [
    {
      "name": "Nome do Item",
      "price": 35.90,
      "description": "Descrição opcional",
      "category": "Nome da Categoria"
    }
  ]
}

NÃO inclua nenhum texto antes ou depois do JSON.`;

    console.log('Calling Lovable AI Vision for menu extraction...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: 'Extraia todos os itens deste cardápio com seus preços e categorias.' },
              imageContent
            ]
          }
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit excedido. Tente novamente em alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    console.log('AI Response:', content);

    // Parse JSON from response
    let parsedItems;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedItems = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON não encontrado na resposta');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      throw new Error('Não foi possível interpretar a resposta da IA');
    }

    return new Response(JSON.stringify(parsedItems), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in extract-menu-from-image:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erro ao processar imagem' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
