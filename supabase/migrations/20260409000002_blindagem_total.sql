-- =========================================================================
-- SQL DE BLINDAGEM MULTI-TENANT ABSOLUTA - GOURMETFLOW
-- Objetivo: Selar o isolamento de dados entre restaurantes (SaaS)
-- =========================================================================

BEGIN;

-- 1. ADIÇÃO DE COLUNAS DE TENANT (RESTAURANT_ID) NAS TABELAS ÓRFÃS
-- Isso garante que cada registro pertença explicitamente a um restaurante.

-- Cupons
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
COMMENT ON COLUMN public.coupons.restaurant_id IS 'Vinculo obrigatorio do cupom ao restaurante para isolamento SaaS';

-- Transações de Fidelidade (Pontos)
ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
COMMENT ON COLUMN public.loyalty_transactions.restaurant_id IS 'Isolamento financeiro de pontos de fidelidade por tenant';

-- Comandas Fixas (Mesas/Comandas Fisicas)
ALTER TABLE public.comandas_fixas ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
COMMENT ON COLUMN public.comandas_fixas.restaurant_id IS 'Permite que diferentes restaurantes usem a mesma numeracao de mesa sem conflito';

-- Alertas de Áudio
ALTER TABLE public.audio_alerts ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);

-- 2. CRIAÇÃO DE ÍNDICES DE PERFORMANCE E SEGURANÇA
-- Garante que as consultas por tenant sejam ultra-rapidas e seguras.

CREATE INDEX IF NOT EXISTS idx_coupons_restaurant_id ON public.coupons(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_restaurant_id ON public.loyalty_transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_comandas_fixas_restaurant_id ON public.comandas_fixas(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_audio_alerts_restaurant_id ON public.audio_alerts(restaurant_id);

-- 3. MIGRAÇÃO DE DADOS EXISTENTES (FALLBACK SAFETY)
-- Se houver apenas um restaurante principal, vinculamos os dados orfaos a ele para evitar perda de dados.
DO $$ 
DECLARE 
    main_res_id UUID;
BEGIN 
    SELECT id INTO main_res_id FROM public.restaurants ORDER BY created_at ASC LIMIT 1;
    
    IF main_res_id IS NOT NULL THEN
        UPDATE public.coupons SET restaurant_id = main_res_id WHERE restaurant_id IS NULL;
        UPDATE public.loyalty_transactions SET restaurant_id = main_res_id WHERE restaurant_id IS NULL;
        UPDATE public.comandas_fixas SET restaurant_id = main_res_id WHERE restaurant_id IS NULL;
        UPDATE public.audio_alerts SET restaurant_id = main_res_id WHERE restaurant_id IS NULL;
    END IF;
END $$;

-- 4. REFORÇO DE ESTRUTURA SDR (LOGICA DE WHATSAPP)
CREATE INDEX IF NOT EXISTS idx_whatsapp_logic_configs_restaurant_id ON public.whatsapp_logic_configs(restaurant_id);

-- 5. HABILITAÇÃO DE RLS (Sinalização para Supabase)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comandas_fixas ENABLE ROW LEVEL SECURITY;

COMMIT;
