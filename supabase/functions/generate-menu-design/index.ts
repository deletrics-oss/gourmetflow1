import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  businessType?: string;
  customPrompt?: string;
  referenceImageBase64?: string;
  restaurantId?: string;
}

const materialDescriptions: Record<string, string> = {
  'menu-a4': 'cardápio formato A4 vertical, layout profissional com seções organizadas',
  'magnet': 'imã de geladeira compacto formato quadrado, destacando pratos principais',
  'flyer': 'panfleto promocional formato A5, design chamativo com ofertas especiais',
  'social': 'post para Instagram quadrado 1080x1080, design moderno para redes sociais',
  'catalog': 'catálogo formato A3 paisagem, fotos grandes e detalhadas dos produtos',
};

const styleDescriptions: Record<string, string> = {
  'modern': 'design clean, minimalista e contemporâneo com elementos geométricos',
  'classic': 'design tradicional e elegante com bordas decorativas e fontes serifadas',
  'minimalist': 'design ultra simples com muito espaço em branco e foco na tipografia',
  'vibrant': 'design colorido e ousado com contrastes fortes e cores vibrantes',
};

const businessStyles: Record<string, string> = {
  pizzaria: 'cores quentes vermelho e laranja, visual italiano tradicional, elementos de madeira e forno a lenha, toalha xadrez',
  hamburgueria: 'estilo americano retrô, elementos neon, cores vibrantes amarelo e vermelho, fotos grandes de hambúrgueres suculentos',
  japones: 'minimalista e elegante, preto e vermelho, elementos zen japoneses, design clean e sofisticado',
  cafeteria: 'tons terrosos e aconchegante, estilo vintage, marrom e bege, elementos de grãos de café e xícaras',
  saudavel: 'verde e branco, design clean e moderno, fotos frescas de saladas e frutas, elementos naturais',
  churrascaria: 'rústico e sofisticado, madeira escura, elementos de fogo e brasa, vermelho e marrom',
  italiana: 'clássico mediterrâneo, verde branco e vermelho da bandeira italiana, elegante com massas e vinhos',
  confeitaria: 'rosa e tons pastel, design delicado e romântico, fotos detalhadas de doces, bolos e sobremesas',
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

// Removed Lovable AI function - now using only Gemini

// Direct Gemini API - Fallback when Lovable AI fails
async function callGeminiDirectImageGen(apiKey: string, prompt: string, referenceImageBase64?: string): Promise<string | null> {
  console.log('Calling Gemini API directly with gemini-2.0-flash-exp...');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

  const parts: any[] = [{ text: prompt }];

  if (referenceImageBase64) {
    const base64Match = referenceImageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (base64Match) {
      parts.push({
        inline_data: {
          mime_type: base64Match[1],
          data: base64Match[2]
        }
      });
    }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
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
  const responseParts = data.candidates?.[0]?.content?.parts || [];
  for (const part of responseParts) {
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
    const body: RequestBody = await req.json();
    const {
      items,
      materialType,
      visualStyle,
      primaryColor,
      accentColor,
      restaurantName,
      logoUrl,
      businessType,
      customPrompt,
      referenceImageBase64,
      restaurantId
    } = body;

    // Get keys - prefer restaurant's key, fallback to env var
    let geminiApiKey = await getGeminiApiKey(restaurantId);
    if (!geminiApiKey) {
      geminiApiKey = Deno.env.get('GEMINI_API_KEY') || null;
    }

    if (!geminiApiKey) {
      throw new Error('Nenhuma chave de API configurada. Configure sua API Key do Gemini em Configurações → IA ou no Dashboard do Supabase.');
    }

    // Formatar lista de itens em português
    const itemsList = items.slice(0, 12).map(item => {
      const price = item.promotional_price || item.price;
      const promoText = item.promotional_price ? ' (PROMOÇÃO!)' : '';
      return `- ${item.name}: R$ ${price.toFixed(2).replace('.', ',')}${promoText}${item.description ? ` - ${item.description.substring(0, 60)}` : ''}`;
    }).join('\n');

    const tipoNegocio = businessType || 'restaurante';
    const estiloNegocio = businessStyles[tipoNegocio] || 'visual profissional e atraente';

    // Prompt completo em português brasileiro
    const prompt = `Crie um cardápio profissional para uma ${tipoNegocio.toUpperCase()} brasileira chamada "${restaurantName}".

TIPO DE ESTABELECIMENTO: ${tipoNegocio}
ESTILO VISUAL CARACTERÍSTICO: ${estiloNegocio}

FORMATO DO MATERIAL: ${materialDescriptions[materialType] || 'cardápio profissional'}
ESTILO DE DESIGN: ${styleDescriptions[visualStyle] || 'moderno e clean'}

CORES DO ESTABELECIMENTO:
- Cor principal: ${primaryColor}
- Cor de destaque/acento: ${accentColor}

ITENS DO CARDÁPIO PARA INCLUIR:
${itemsList}

${customPrompt ? `\nINSTRUÇÕES ESPECÍFICAS DO USUÁRIO:\n${customPrompt}\n` : ''}

REQUISITOS OBRIGATÓRIOS:
- Visual AUTÊNTICO de ${tipoNegocio} brasileira de alta qualidade
- Todo o texto DEVE estar em PORTUGUÊS BRASILEIRO
- Preços no formato brasileiro (R$ XX,00)
- Layout profissional igual aos melhores cardápios de ${tipoNegocio}s reais
- Nome "${restaurantName}" em destaque grande e legível
- Fotos de comida REALISTAS, apetitosas e de alta qualidade
- Design pronto para impressão em alta resolução
- Elementos decorativos combinando com o tipo de negócio

${referenceImageBase64 ? 'IMPORTANTE: Analise a imagem de referência anexada e CLONE/COPIE seu estilo visual, layout e composição.' : ''}

Gere uma imagem de cardápio profissional e bonita.`;

    console.log('Gerando design de cardápio para:', restaurantName, '- Tipo:', tipoNegocio);

    let imageUrl: string | null = null;
    let usedMethod = '';

    // Use Gemini Direct only
    console.log('Using Gemini Direct for menu design generation...');
    try {
      imageUrl = await callGeminiDirectImageGen(geminiApiKey, prompt, referenceImageBase64);
      usedMethod = 'Gemini Direct';
    } catch (error: any) {
      console.log('Gemini Direct failed:', error.message);
    }

    if (!imageUrl) {
      console.error('Nenhuma imagem gerada por nenhum método');
      throw new Error('Nenhuma imagem gerada. Tente novamente ou configure sua chave do Gemini em Configurações → IA.');
    }

    console.log('Imagem gerada com sucesso usando:', usedMethod);

    return new Response(
      JSON.stringify({
        imageUrl,
        message: 'Imagem gerada com sucesso',
        method: usedMethod
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro ao gerar design de cardápio:', error);

    if (error.status === 429 || error.status === 402) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const errorMessage = error.message || 'Falha ao gerar design do cardápio';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
