-- ============================================
-- MIGRATION: Sistema de Comandas Fixas (Cartões)
-- ============================================

-- 1. Criar tabela de comandas fixas (cartões numerados)
CREATE TABLE IF NOT EXISTS public.comandas_fixas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero INTEGER NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Popular com números 1-100
INSERT INTO public.comandas_fixas (numero)
SELECT generate_series(1, 100)
ON CONFLICT (numero) DO NOTHING;

-- 3. Adicionar campo comanda_fixa_id em orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS comanda_fixa_id UUID REFERENCES public.comandas_fixas(id);

-- 4. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_orders_comanda_fixa ON public.orders(comanda_fixa_id);

-- 5. Atualizar RLS para comandas fixas
ALTER TABLE public.comandas_fixas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comandas fixas"
ON public.comandas_fixas FOR SELECT
USING (true);

CREATE POLICY "Staff can manage comandas fixas"
ON public.comandas_fixas FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_restaurants
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 6. Adicionar trigger de updated_at
CREATE TRIGGER update_comandas_fixas_updated_at
BEFORE UPDATE ON public.comandas_fixas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.comandas_fixas IS 'Cartões de comanda numerados (1-100) que podem ser usados sem vínculo com mesa';