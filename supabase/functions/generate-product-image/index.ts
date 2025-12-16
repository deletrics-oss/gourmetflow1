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
    const { name, category, description } = await req.json();

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Nome do produto é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Build optimized prompt for food photography - must explicitly request image generation
    const categoryText = category ? ` (${category})` : '';
    const descText = description ? ` - ${description}` : '';
    
    const prompt = `Generate a photorealistic image of the food item "${name}"${categoryText}${descText}. 
Create a professional food photography shot with: soft natural lighting, shallow depth of field, 
clean white or light gray background, appetizing presentation, 45-degree angle, vibrant colors, 
sharp focus on the dish. Square format, high resolution. DO NOT include any text in the image.`;

    console.log('Generating image for:', name);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract base64 image from response - check multiple possible locations
    let imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    // Fallback: check if image is in different structure
    if (!imageData) {
      imageData = data.choices?.[0]?.message?.images?.[0]?.url;
    }
    if (!imageData) {
      imageData = data.images?.[0]?.image_url?.url;
    }
    if (!imageData) {
      imageData = data.images?.[0]?.url;
    }
    
    if (!imageData) {
      console.error('No image in response:', JSON.stringify(data));
      // Return a placeholder response instead of error so the item still saves
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

  } catch (error: unknown) {
    console.error('Error in generate-product-image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao gerar imagem';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
