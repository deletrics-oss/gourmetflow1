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
  businessType?: string;
  customPrompt?: string;
  referenceImageBase64?: string;
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
      referenceImageBase64
    } = body;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
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

    // Construir mensagem - com ou sem imagem de referência
    let messages: any[];
    
    if (referenceImageBase64) {
      messages = [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: referenceImageBase64 } }
          ],
        },
      ];
    } else {
      messages = [
        {
          role: 'user',
          content: prompt,
        },
      ];
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages,
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos para continuar.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Resposta da IA recebida com sucesso');

    // Extrair imagem da resposta
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error('Nenhuma imagem na resposta:', JSON.stringify(data).substring(0, 500));
      throw new Error('Nenhuma imagem gerada');
    }

    return new Response(
      JSON.stringify({ 
        imageUrl,
        message: data.choices?.[0]?.message?.content || 'Imagem gerada com sucesso',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Erro ao gerar design de cardápio:', error);
    const errorMessage = error instanceof Error ? error.message : 'Falha ao gerar design do cardápio';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
