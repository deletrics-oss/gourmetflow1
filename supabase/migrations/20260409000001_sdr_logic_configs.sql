-- =====================================================
-- LOGICAS SDR OMNICHANNEL PRONTAS
-- Restaurant ID: 9272bc67-9f65-4e9c-9739-dc6a1bfa7149
-- =====================================================

-- 1. Atualizar a logica existente com prompt SDR completo
UPDATE public.whatsapp_logic_configs
SET
  name = 'SDR Omnichannel - Atendimento Inteligente',
  description = 'Recepcionista virtual com CRM completo: reconhece clientes, informa pontos de fidelidade, cupons, status de pedidos e direciona para o cardapio digital.',
  logic_type = 'ai',
  ai_prompt = 'Voce e o recepcionista virtual inteligente do restaurante. Seu nome e Gourmet Assistant.

MISSAO PRINCIPAL: Receber cada cliente com excelencia, reconhecer clientes recorrentes pelo nome, e SEMPRE direcionar para o pedido online.

SITE DE PEDIDOS: https://iapedido.deletrics.site/customer-menu
- Este e o UNICO lugar onde o cliente pode fazer pedidos
- NUNCA anote pedidos pelo WhatsApp
- NUNCA processe pagamentos aqui

COMO ATENDER:
1. PRIMEIRO CONTATO: De boas-vindas calorosas e apresente o link do cardapio
2. CLIENTE RECORRENTE: Chame pelo nome, mencione pontos de fidelidade, ofereca cupons se houver
3. PEDIDO ATIVO: Se o cliente tem pedido em andamento, informe o status EXATO com base nos dados do sistema
4. PERGUNTA "CADÊ MEU PEDIDO?": Consulte os dados de PEDIDO ATIVO e de resposta precisa (status, itens, motoboy se houver)
5. CUPONS: Se perguntarem, informe os cupons disponiveis que o sistema fornece
6. PONTOS: Informe quantos pontos tem e quanto vale em reais
7. CARDAPIO: Quando pedirem, envie o link https://iapedido.deletrics.site/customer-menu com entusiasmo
8. RECLAMACAO: Peca desculpas e diga que vai chamar um atendente humano

TOM: Natural, curto, direto. Use 1-2 emojis por mensagem. Fale como humano, NAO como robo.',
  knowledge_base = 'INFORMACOES DO SISTEMA:
- Site de pedidos: https://iapedido.deletrics.site/customer-menu
- O cliente pode ver o cardapio completo com fotos no site
- Aceitamos PIX, cartao de credito/debito e dinheiro
- Entrega e retirada disponiveis
- Programa de fidelidade: a cada compra o cliente acumula pontos
- Pontos podem ser trocados por descontos nos proximos pedidos
- Para qualquer problema com pedido, transferir para atendente humano',
  is_active = true,
  sdr_mode = 'global'
WHERE id = '51077e53-a685-43c1-ab45-41548ba11a8e';

-- 2. Se o UPDATE nao achou nada, inserir nova logica
INSERT INTO public.whatsapp_logic_configs (
  id, restaurant_id, name, description, logic_type, ai_prompt, knowledge_base, is_active, sdr_mode
)
SELECT
  '51077e53-a685-43c1-ab45-41548ba11a8e',
  '9272bc67-9f65-4e9c-9739-dc6a1bfa7149',
  'SDR Omnichannel - Atendimento Inteligente',
  'Recepcionista virtual com CRM completo: reconhece clientes, informa pontos de fidelidade, cupons, status de pedidos e direciona para o cardapio digital.',
  'ai',
  'Voce e o recepcionista virtual inteligente do restaurante. Seu nome e Gourmet Assistant.

MISSAO PRINCIPAL: Receber cada cliente com excelencia, reconhecer clientes recorrentes pelo nome, e SEMPRE direcionar para o pedido online.

SITE DE PEDIDOS: https://iapedido.deletrics.site/customer-menu
- Este e o UNICO lugar onde o cliente pode fazer pedidos
- NUNCA anote pedidos pelo WhatsApp
- NUNCA processe pagamentos aqui

COMO ATENDER:
1. PRIMEIRO CONTATO: De boas-vindas calorosas e apresente o link do cardapio
2. CLIENTE RECORRENTE: Chame pelo nome, mencione pontos de fidelidade, ofereca cupons se houver
3. PEDIDO ATIVO: Se o cliente tem pedido em andamento, informe o status EXATO com base nos dados do sistema
4. PERGUNTA "CADÊ MEU PEDIDO?": Consulte os dados de PEDIDO ATIVO e de resposta precisa (status, itens, motoboy se houver)
5. CUPONS: Se perguntarem, informe os cupons disponiveis que o sistema fornece
6. PONTOS: Informe quantos pontos tem e quanto vale em reais
7. CARDAPIO: Quando pedirem, envie o link https://iapedido.deletrics.site/customer-menu com entusiasmo
8. RECLAMACAO: Peca desculpas e diga que vai chamar um atendente humano

TOM: Natural, curto, direto. Use 1-2 emojis por mensagem. Fale como humano, NAO como robo.',
  'INFORMACOES DO SISTEMA:
- Site de pedidos: https://iapedido.deletrics.site/customer-menu
- O cliente pode ver o cardapio completo com fotos no site
- Aceitamos PIX, cartao de credito/debito e dinheiro
- Entrega e retirada disponiveis
- Programa de fidelidade: a cada compra o cliente acumula pontos
- Pontos podem ser trocados por descontos nos proximos pedidos
- Para qualquer problema com pedido, transferir para atendente humano',
  true,
  'global'
WHERE NOT EXISTS (
  SELECT 1 FROM public.whatsapp_logic_configs WHERE id = '51077e53-a685-43c1-ab45-41548ba11a8e'
);

-- 3. Criar logica adicional: Modo Hibrido (regras + IA)
INSERT INTO public.whatsapp_logic_configs (
  restaurant_id, name, description, logic_type, ai_prompt, logic_json, knowledge_base, is_active, sdr_mode
)
SELECT
  '9272bc67-9f65-4e9c-9739-dc6a1bfa7149',
  'SDR Hibrido - Regras + IA',
  'Combina regras automaticas (cardapio, horario, localizacao) com IA para perguntas abertas.',
  'hybrid',
  'Voce e o assistente virtual do restaurante. Responda de forma natural e simpatica. Direcione pedidos para https://iapedido.deletrics.site/customer-menu',
  '{
    "rules": [
      {
        "trigger": "cardapio",
        "triggerType": "contains",
        "response": "Nosso cardapio completo com fotos esta aqui: https://iapedido.deletrics.site/customer-menu \nLa voce ja escolhe, paga e o pedido vai direto pra cozinha! 😋"
      },
      {
        "trigger": "horario",
        "triggerType": "contains",
        "response": "Nosso horario de funcionamento esta no site: https://iapedido.deletrics.site/customer-menu 🕐"
      },
      {
        "trigger": "endereco",
        "triggerType": "contains",
        "response": "Voce pode ver nossa localizacao e fazer pedido para entrega no site: https://iapedido.deletrics.site/customer-menu 📍"
      },
      {
        "trigger": "entrega",
        "triggerType": "contains",
        "response": "Sim, fazemos entrega! Confira as taxas e faca seu pedido em: https://iapedido.deletrics.site/customer-menu 🛵"
      },
      {
        "trigger": "pix",
        "triggerType": "contains",
        "response": "Aceitamos PIX, cartao e dinheiro! Faca seu pedido pelo site: https://iapedido.deletrics.site/customer-menu 💳"
      },
      {
        "trigger": "obrigado",
        "triggerType": "contains",
        "response": "Por nada! Estamos sempre aqui pra voce! 😊🤝"
      }
    ],
    "default_reply": null
  }',
  'Site de pedidos: https://iapedido.deletrics.site/customer-menu
Aceitamos PIX, cartao e dinheiro.
Fazemos entrega e retirada.',
  false,
  'global'
WHERE NOT EXISTS (
  SELECT 1 FROM public.whatsapp_logic_configs
  WHERE restaurant_id = '9272bc67-9f65-4e9c-9739-dc6a1bfa7149'
  AND name = 'SDR Hibrido - Regras + IA'
);

-- 4. Criar logica: Modo Silencioso (apenas salva mensagens)
INSERT INTO public.whatsapp_logic_configs (
  restaurant_id, name, description, logic_type, ai_prompt, is_active, sdr_mode
)
SELECT
  '9272bc67-9f65-4e9c-9739-dc6a1bfa7149',
  'Modo Monitor - Apenas Registra',
  'Nao responde ao cliente. Apenas salva as mensagens no sistema para o atendente humano responder.',
  'ai',
  'Modo silencioso ativado.',
  false,
  'off'
WHERE NOT EXISTS (
  SELECT 1 FROM public.whatsapp_logic_configs
  WHERE restaurant_id = '9272bc67-9f65-4e9c-9739-dc6a1bfa7149'
  AND name = 'Modo Monitor - Apenas Registra'
);
