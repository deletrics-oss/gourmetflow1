import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getGeminiApiKey(restaurantId?: string): Promise<string | null> {
  console.log('[GET-KEY] Fetching Gemini API key for restaurantId:', restaurantId);

  if (!restaurantId) {
    console.log('[GET-KEY] No restaurantId provided, returning null');
    return null;
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('gemini_api_key')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    console.log('[GET-KEY] Query result:', {
      found: !!data,
      hasKey: !!data?.gemini_api_key,
      keyLength: data?.gemini_api_key?.length || 0,
      error: error?.message
    });

    if (error) {
      console.error('[GET-KEY] Database error:', error.message);
      return null;
    }

    if (!data?.gemini_api_key) {
      console.log('[GET-KEY] No Gemini API key configured for this restaurant');
      return null;
    }

    console.log('[GET-KEY] Successfully retrieved Gemini API key');
    return data.gemini_api_key;
  } catch (e) {
    console.error('[GET-KEY] Exception:', e);
    return null;
  }
}

// Removed Lovable AI function - now using only Gemini

// Direct Gemini API - gemini-2.0-flash-exp for image generation
async function callGeminiDirectImageGen(apiKey: string, prompt: string): Promise<string | null> {
  console.log('[GEMINI-DIRECT] Calling with gemini-2.0-flash-exp...');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"]
      }
    }),
  });

  console.log('[GEMINI-DIRECT] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GEMINI-DIRECT] Error:', response.status, errorText);
    return null;
  }

  const data = await response.json();
  console.log('[GEMINI-DIRECT] Response received, checking for image...');

  // Extract image from response - check both naming conventions
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const imageData = part.inlineData?.data || part.inline_data?.data;
    if (imageData) {
      const mimeType = part.inlineData?.mimeType || part.inline_data?.mime_type || 'image/png';
      console.log('[GEMINI-DIRECT] Image extracted successfully');
      return `data:${mimeType};base64,${imageData}`;
    }
  }

  console.log('[GEMINI-DIRECT] No image in response');
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, category, description, restaurantId } = await req.json();

    console.log('[MAIN] ========================================');
    console.log('[MAIN] Request received:', { name, category, restaurantId });

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Nome do produto é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get keys - prefer restaurant's own key, fallback to env var
    let geminiApiKey = await getGeminiApiKey(restaurantId);

    // If no restaurant-specific key, try global env var
    if (!geminiApiKey) {
      geminiApiKey = Deno.env.get('GEMINI_API_KEY') || null;
    }

    console.log('[MAIN] Keys available:', {
      hasGeminiKey: !!geminiApiKey
    });

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma chave de API configurada. Configure sua API Key do Gemini em Configurações → IA ou no Dashboard do Supabase.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build optimized prompt for food photography
    const categoryText = category ? ` (${category})` : '';
    const descText = description ? ` - ${description}` : '';

    const prompt = `Generate a photorealistic image of the food item "${name}"${categoryText}${descText}. 
Create a professional food photography shot with: soft natural lighting, shallow depth of field, 
clean white or light gray background, appetizing presentation, 45-degree angle, vibrant colors, 
sharp focus on the dish. Square format, high resolution. DO NOT include any text in the image.`;

    let imageData: string | null = null;
    let usedMethod = '';

    // Use Gemini Direct
    console.log('[MAIN] Using Gemini Direct for image generation');
    try {
      imageData = await callGeminiDirectImageGen(geminiApiKey, prompt);
      if (imageData) {
        usedMethod = 'Gemini Direct';
      }
    } catch (error: any) {
      console.log('[MAIN] Gemini Direct failed:', error.message);
    }

    if (!imageData) {
      console.error('[MAIN] No image generated by any method');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Imagem não gerada. Tente novamente ou configure sua API Key do Gemini.',
          productName: name
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[MAIN] SUCCESS - Image generated using:', usedMethod);

    return new Response(
      JSON.stringify({
        success: true,
        imageBase64: imageData,
        productName: name,
        method: usedMethod
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[MAIN] ERROR:', error);

    if (error.status === 429 || error.status === 402) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const errorMessage = error.message || 'Erro ao gerar imagem';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
