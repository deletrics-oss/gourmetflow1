import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getGeminiApiKey(restaurantId?: string): Promise<string | null> {
  if (!restaurantId) return null;
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('gemini_api_key')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();
    
    if (error || !data?.gemini_api_key) return null;
    return data.gemini_api_key;
  } catch (e) {
    console.error('Error fetching Gemini API key:', e);
    return null;
  }
}

async function callGeminiDirect(apiKey: string, systemPrompt: string, imageContent: any) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  
  const parts: any[] = [{ text: systemPrompt + '\n\nExtraia todos os itens deste cardápio com seus preços e categorias.' }];
  
  if (imageContent) {
    const imageData = imageContent.image_url.url;
    // Handle both base64 and URL formats
    if (imageData.startsWith('data:')) {
      const base64Match = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        parts.push({
          inline_data: {
            mime_type: base64Match[1],
            data: base64Match[2]
          }
        });
      }
    } else {
      // For URLs, fetch and convert to base64
      const imgResponse = await fetch(imageData);
      const imgBuffer = await imgResponse.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
      parts.push({
        inline_data: {
          mime_type: imgResponse.headers.get('content-type') || 'image/jpeg',
          data: base64
        }
      });
    }
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini direct API error:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callLovableAI(apiKey: string, systemPrompt: string, imageContent: any) {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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
      throw { status: 429, message: 'Rate limit excedido. Tente novamente em alguns segundos.' };
    }
    if (response.status === 402) {
      throw { status: 402, message: 'Créditos de IA esgotados. Por favor, adicione créditos em Configurações → Workspace → Usage para continuar.' };
    }
    
    throw new Error(`Erro na API: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageUrl, restaurantId } = await req.json();
    
    // Try to get restaurant's own Gemini API key first
    const geminiApiKey = await getGeminiApiKey(restaurantId);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!geminiApiKey && !LOVABLE_API_KEY) {
      throw new Error('Nenhuma chave de API configurada. Configure sua API Key do Gemini em Configurações → IA.');
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

    let content: string;
    
    if (geminiApiKey) {
      console.log('Using restaurant Gemini API key for menu extraction');
      content = await callGeminiDirect(geminiApiKey, systemPrompt, imageContent);
    } else {
      console.log('Using Lovable AI for menu extraction');
      content = await callLovableAI(LOVABLE_API_KEY!, systemPrompt, imageContent);
    }
    
    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    console.log('AI Response:', content);

    // Parse JSON from response
    let parsedItems;
    try {
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

  } catch (error: any) {
    console.error('Error in extract-menu-from-image:', error);
    
    // Handle specific status errors
    if (error.status === 429 || error.status === 402) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro ao processar imagem' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
