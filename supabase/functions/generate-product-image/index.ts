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

// Lovable AI Gateway - Nano Banana model (best for image generation)
async function callLovableAIImageGen(apiKey: string, prompt: string): Promise<string | null> {
  console.log('Calling Lovable AI Gateway with nano banana model...');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image-preview',
      messages: [{ role: 'user', content: prompt }],
      modalities: ['image', 'text']
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lovable AI Gateway error:', response.status, errorText);
    
    if (response.status === 429) {
      throw { status: 429, message: 'Limite de requisições excedido. Tente novamente mais tarde.' };
    }
    if (response.status === 402) {
      throw { status: 402, message: 'Créditos de IA esgotados. Configure sua API Key do Gemini em Configurações → IA.' };
    }
    
    throw new Error(`Lovable AI error: ${response.status}`);
  }

  const data = await response.json();
  console.log('Lovable AI response received');
  
  // Extract image from response
  const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (imageUrl) {
    console.log('Image extracted from Lovable AI response');
    return imageUrl;
  }
  
  console.log('No image in Lovable AI response');
  return null;
}

// Direct Gemini API - Fallback when Lovable AI fails
async function callGeminiDirectImageGen(apiKey: string, prompt: string): Promise<string | null> {
  console.log('Calling Gemini API directly with gemini-2.0-flash-exp...');
  
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
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    return null;
  }
  
  const data = await response.json();
  console.log('Gemini API response received');
  
  // Extract image from response - check both naming conventions
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const imageData = part.inlineData?.data || part.inline_data?.data;
    if (imageData) {
      const mimeType = part.inlineData?.mimeType || part.inline_data?.mime_type || 'image/png';
      console.log('Image extracted from Gemini response');
      return `data:${mimeType};base64,${imageData}`;
    }
  }
  
  console.log('No image in Gemini response');
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, category, description, restaurantId } = await req.json();

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Nome do produto é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiApiKey = await getGeminiApiKey(restaurantId);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!geminiApiKey && !LOVABLE_API_KEY) {
      throw new Error('Nenhuma chave de API configurada. Configure sua API Key do Gemini em Configurações → IA.');
    }

    // Build optimized prompt for food photography
    const categoryText = category ? ` (${category})` : '';
    const descText = description ? ` - ${description}` : '';
    
    const prompt = `Generate a photorealistic image of the food item "${name}"${categoryText}${descText}. 
Create a professional food photography shot with: soft natural lighting, shallow depth of field, 
clean white or light gray background, appetizing presentation, 45-degree angle, vibrant colors, 
sharp focus on the dish. Square format, high resolution. DO NOT include any text in the image.`;

    console.log('Generating image for:', name);

    let imageData: string | null = null;
    let usedMethod = '';
    
    // Strategy: Try Lovable AI first (better model), then fallback to direct Gemini
    if (LOVABLE_API_KEY) {
      try {
        imageData = await callLovableAIImageGen(LOVABLE_API_KEY, prompt);
        usedMethod = 'Lovable AI (nano banana)';
      } catch (error: any) {
        console.log('Lovable AI failed, will try fallback:', error.message);
        // If it's a credit/rate limit error, try Gemini as fallback
        if ((error.status === 429 || error.status === 402) && geminiApiKey) {
          console.log('Trying Gemini direct API as fallback...');
          imageData = await callGeminiDirectImageGen(geminiApiKey, prompt);
          usedMethod = 'Gemini Direct';
        } else if (!geminiApiKey) {
          throw error;
        }
      }
    }
    
    // If still no image, try direct Gemini
    if (!imageData && geminiApiKey) {
      console.log('Trying Gemini direct API...');
      imageData = await callGeminiDirectImageGen(geminiApiKey, prompt);
      usedMethod = 'Gemini Direct';
    }
    
    if (!imageData) {
      console.error('No image generated by any method');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Imagem não gerada. Tente novamente.',
          productName: name
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Image generated successfully for:', name, 'using:', usedMethod);

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
    console.error('Error in generate-product-image:', error);
    
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
