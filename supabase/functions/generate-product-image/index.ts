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

async function callGeminiDirectImageGen(apiKey: string, prompt: string): Promise<string | null> {
  // Use gemini-2.0-flash-exp for image generation with responseModalities
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["Text", "Image"]
      }
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini direct image API error:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Extract image from response - check multiple possible locations
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inline_data?.data) {
      const mimeType = part.inline_data.mime_type || 'image/png';
      return `data:${mimeType};base64,${part.inline_data.data}`;
    }
  }
  
  return null;
}

async function callLovableAIImageGen(apiKey: string, prompt: string): Promise<string | null> {
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
    console.error('AI API error:', response.status, errorText);
    
    if (response.status === 429) {
      throw { status: 429, message: 'Rate limit exceeded. Tente novamente em alguns segundos.' };
    }
    if (response.status === 402) {
      throw { status: 402, message: 'Créditos de IA esgotados. Configure sua API Key do Gemini em Configurações → IA.' };
    }
    
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Extract base64 image from response - check multiple possible locations
  let imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageData) imageData = data.choices?.[0]?.message?.images?.[0]?.url;
  if (!imageData) imageData = data.images?.[0]?.image_url?.url;
  if (!imageData) imageData = data.images?.[0]?.url;
  
  return imageData;
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

    // Try to get restaurant's own Gemini API key first
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

    console.log('Generating image for:', name, geminiApiKey ? '(using restaurant Gemini key)' : '(using Lovable AI)');

    let imageData: string | null = null;
    
    if (geminiApiKey) {
      imageData = await callGeminiDirectImageGen(geminiApiKey, prompt);
    } else {
      imageData = await callLovableAIImageGen(LOVABLE_API_KEY!, prompt);
    }
    
    if (!imageData) {
      console.error('No image in response');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Imagem não gerada pelo modelo',
          productName: name
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Image generated successfully for:', name);

    return new Response(
      JSON.stringify({ 
        success: true,
        imageBase64: imageData,
        productName: name
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
