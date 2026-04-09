-- =====================================================
-- MIGRATION: Order Reviews + Status History Enhancement
-- SDR Omnichannel Integration
-- Data: Abril 2026
-- =====================================================

-- 1. Tabela de avaliacoes de pedidos via WhatsApp
CREATE TABLE IF NOT EXISTS public.order_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  source TEXT DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index para busca rapida por restaurante
CREATE INDEX IF NOT EXISTS idx_order_reviews_restaurant
  ON public.order_reviews(restaurant_id);

CREATE INDEX IF NOT EXISTS idx_order_reviews_order
  ON public.order_reviews(order_id);

-- 2. Garantir que order_status_history tem old_status
ALTER TABLE public.order_status_history
  ADD COLUMN IF NOT EXISTS old_status TEXT;

-- 3. Index para busca de historico por pedido
CREATE INDEX IF NOT EXISTS idx_order_status_history_order
  ON public.order_status_history(order_id, created_at DESC);

-- 4. Garantir que whatsapp_conversations tem campo context (JSONB)
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS context JSONB;

-- 5. RLS Policies para order_reviews
ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "order_reviews_select" ON public.order_reviews
    FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "order_reviews_insert" ON public.order_reviews
    FOR INSERT WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "order_reviews_service" ON public.order_reviews
    FOR ALL USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 6. Habilitar Realtime na tabela orders (para o listener proativo)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 7. Function para calcular media de avaliacao do restaurante
CREATE OR REPLACE FUNCTION get_restaurant_avg_rating(p_restaurant_id UUID)
RETURNS TABLE(avg_rating NUMERIC, total_reviews BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(AVG(r.rating)::numeric, 1) as avg_rating,
    COUNT(*)::bigint as total_reviews
  FROM public.order_reviews r
  WHERE r.restaurant_id = p_restaurant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
