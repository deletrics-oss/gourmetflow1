import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getGeminiApiKey(restaurantId?: string): Promise<string | null> {
  console.log('[GET-KEY] Checking for Gemini API key, restaurantId:', restaurantId);

  if (!restaurantId) {
    console.log('[GET-KEY] No restaurantId provided, returning null');
    return null;
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[GET-KEY] Querying restaurant_settings for restaurantId:', restaurantId);

    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('gemini_api_key')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    console.log('[GET-KEY] Query result - data:', data ? 'found' : 'null', 'error:', error?.message || 'none');
    console.log('[GET-KEY] Has gemini_api_key:', !!data?.gemini_api_key);

    if (error) {
      console.error('[GET-KEY] Database error:', error);
      return null;
    }

    if (!data?.gemini_api_key) {
      console.log('[GET-KEY] No gemini_api_key found in settings');
      return null;
    }

    console.log('[GET-KEY] Found Gemini API key (length):', data.gemini_api_key.length);
    return data.gemini_api_key;
  } catch (e) {
    console.error('[GET-KEY] Exception:', e);
    return null;
  }
}

// Direct Gemini API for menu extraction (text analysis with vision)
async function callGeminiDirect(apiKey: string, systemPrompt: string, imageContent: any) {
  console.log('[GEMINI-DIRECT] Starting Gemini API call...');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const parts: any[] = [{ text: systemPrompt + '\n\nExtraia todos os itens deste cardápio com seus preços e categorias.' }];

  if (imageContent) {
    const imageData = imageContent.image_url.url;
    if (imageData.startsWith('data:')) {
      const base64Match = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (base64Match) {
        parts.push({
          inline_data: {
            mime_type: base64Match[1],
            data: base64Match[2]
          }
        });
        console.log('[GEMINI-DIRECT] Added base64 image, mime:', base64Match[1]);
      }
    } else {
      console.log('[GEMINI-DIRECT] Fetching image from URL...');
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

  console.log('[GEMINI-DIRECT] Sending request to Gemini...');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GEMINI-DIRECT] API error:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log('[GEMINI-DIRECT] Response received, length:', text.length);
  return text;
}

// Removed Lovable AI function - now using only Gemini

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { imageBase64, imageUrl, restaurantId } = body;

    console.log('[MAIN] Request received - restaurantId:', restaurantId);
    console.log('[MAIN] Has imageBase64:', !!imageBase64, 'Has imageUrl:', !!imageUrl);

    // Get keys - prefer restaurant's key, fallback to env var
    let geminiApiKey = await getGeminiApiKey(restaurantId);
    if (!geminiApiKey) {
      geminiApiKey = Deno.env.get('GEMINI_API_KEY') || null;
    }

    console.log('[MAIN] Gemini key found:', !!geminiApiKey);

    if (!geminiApiKey) {
      return new Response(JSON.stringify({
        error: 'Para usar extração com IA, configure sua chave do Gemini em Configurações → IA ou no Dashboard do Supabase. Acesse aistudio.google.com para obter uma chave gratuita.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
    let usedMethod = '';

    // Use Gemini Direct only
    console.log('[MAIN] Using Gemini Direct API...');
    content = await callGeminiDirect(geminiApiKey, systemPrompt, imageContent);
    usedMethod = 'Gemini Direct';

    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    console.log('[MAIN] AI Response received via:', usedMethod);

    // Parse JSON from response - handle markdown code blocks
    let parsedItems;
    try {
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedItems = JSON.parse(jsonMatch[0]);
        console.log('[MAIN] Parsed', parsedItems.items?.length || 0, 'items');
      } else {
        throw new Error('JSON não encontrado na resposta');
      }
    } catch (parseError) {
      console.error('[MAIN] Parse error:', parseError);
      console.error('[MAIN] Raw content:', content.substring(0, 500));
      throw new Error('Não foi possível interpretar a resposta da IA');
    }

    return new Response(JSON.stringify({ ...parsedItems, method: usedMethod }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[MAIN] Error:', error);

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
