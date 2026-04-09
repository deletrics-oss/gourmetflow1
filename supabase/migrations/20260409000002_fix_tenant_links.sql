-- =====================================================
-- CORREÇÃO DE LINKS PARA ISOLAMENTO DE TENANT (SDR)
-- =====================================================

-- 1. Atualizar a lógica principal (SDR Omnichannel)
UPDATE public.whatsapp_logic_configs
SET 
  ai_prompt = REPLACE(
    REPLACE(ai_prompt, 'https://iapedido.deletrics.site/customer-menu', 'https://iapedido.deletrics.site/customer-menu?restaurantId=' || restaurant_id),
    'SITE DE PEDIDOS: https://iapedido.deletrics.site/customer-menu',
    'SITE DE PEDIDOS: O link sera fornecido dinamicamente pelo sistema.'
  ),
  knowledge_base = REPLACE(
    knowledge_base, 
    'https://iapedido.deletrics.site/customer-menu', 
    'https://iapedido.deletrics.site/customer-menu?restaurantId=' || restaurant_id
  )
WHERE ai_prompt LIKE '%https://iapedido.deletrics.site/customer-menu%';

-- 2. Atualizar o JSON de regras (Modo Híbrido) para incluir o restaurantId
UPDATE public.whatsapp_logic_configs
SET 
  logic_json = jsonb_set(
    logic_json::jsonb, 
    '{rules}', 
    (
      SELECT jsonb_agg(
        jsonb_set(
          rule, 
          '{response}', 
          to_jsonb(REPLACE(rule->>'response', 'https://iapedido.deletrics.site/customer-menu', 'https://iapedido.deletrics.site/customer-menu?restaurantId=' || (SELECT restaurant_id FROM public.whatsapp_logic_configs WHERE id = wlc.id)))
        )
      )
      FROM jsonb_array_elements(logic_json->'rules') AS rule
    )
  )
FROM public.whatsapp_logic_configs wlc
WHERE public.whatsapp_logic_configs.id = wlc.id 
AND public.whatsapp_logic_configs.logic_type = 'hybrid'
AND public.whatsapp_logic_configs.logic_json->>'rules' IS NOT NULL;
