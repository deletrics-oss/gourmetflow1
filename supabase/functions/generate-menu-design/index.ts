import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  promotional_price: number | null;
  image_url: string | null;
  category_name?: string;
}

interface RequestBody {
  items: MenuItem[];
  materialType: string;
  visualStyle: string;
  primaryColor: string;
  accentColor: string;
  restaurantName: string;
  logoUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { items, materialType, visualStyle, primaryColor, accentColor, restaurantName, logoUrl } = body;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Mapear tipo de material para descrição
    const materialDescriptions: Record<string, string> = {
      'menu-a4': 'A4 restaurant menu, portrait orientation, professional layout with sections',
      'magnet': 'compact fridge magnet design, square format, featuring main dishes',
      'flyer': 'promotional flyer, A5 format, eye-catching design with special offers',
      'social': 'Instagram post, square 1080x1080, modern social media design',
      'catalog': 'A3 catalog spread, landscape, detailed product showcase with large photos',
    };

    // Mapear estilo visual
    const styleDescriptions: Record<string, string> = {
      'modern': 'clean, minimalist, contemporary design with geometric elements',
      'classic': 'traditional, elegant, with decorative borders and serif fonts',
      'minimalist': 'ultra simple, lots of white space, focus on typography',
      'vibrant': 'colorful, bold, dynamic with strong contrasts',
    };

    // Formatar itens para o prompt
    const itemsList = items.slice(0, 10).map(item => {
      const price = item.promotional_price || item.price;
      return `- ${item.name}: R$ ${price.toFixed(2)}${item.description ? ` (${item.description.substring(0, 50)})` : ''}`;
    }).join('\n');

    // Construir prompt detalhado
    const prompt = `Create a professional ${materialDescriptions[materialType] || 'restaurant menu'} for a restaurant called "${restaurantName}".

Style: ${styleDescriptions[visualStyle] || 'modern'} design
Primary color: ${primaryColor}
Accent color: ${accentColor}

Menu items to feature:
${itemsList}

Design requirements:
- High resolution, print-ready quality
- Beautiful food photography style backgrounds
- Clear, readable typography for item names and prices
- Professional layout with proper spacing
- Restaurant name prominently displayed
- Appetizing and inviting visual appeal
- Include decorative elements matching the ${visualStyle} style

The design should look like it was created by a professional graphic designer for a real restaurant.`;

    console.log('Generating menu design with prompt:', prompt.substring(0, 200) + '...');

    // Chamar Lovable AI para gerar imagem
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
            content: prompt,
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Extrair imagem da resposta
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(data).substring(0, 500));
      throw new Error('No image generated');
    }

    return new Response(
      JSON.stringify({ 
        imageUrl,
        message: data.choices?.[0]?.message?.content || 'Image generated successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error generating menu design:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate menu design';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
