-- Adicionar colunas de fidelidade em restaurant_settings
ALTER TABLE public.restaurant_settings 
ADD COLUMN IF NOT EXISTS loyalty_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS loyalty_points_per_real NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS loyalty_redemption_value NUMERIC DEFAULT 0.01;

-- Adicionar colunas de pontos de fidelidade em customers
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;

-- Criar tabela para histórico de pontos de fidelidade
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'earned', 'redeemed'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own loyalty transactions" 
ON public.loyalty_transactions 
FOR SELECT 
USING (true);

CREATE POLICY "Staff can manage loyalty transactions" 
ON public.loyalty_transactions 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Atualizar tabela de pedidos para incluir pontos ganhos e usados
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS loyalty_points_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_points_used INTEGER DEFAULT 0;

-- Inserir imagens demo para os itens existentes
UPDATE public.menu_items 
SET demo_images = '[
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400",
  "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400"
]'::jsonb
WHERE name ILIKE '%pizza%';

UPDATE public.menu_items 
SET demo_images = '[
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400",
  "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400"
]'::jsonb
WHERE name ILIKE '%burger%' OR name ILIKE '%hamburguer%';