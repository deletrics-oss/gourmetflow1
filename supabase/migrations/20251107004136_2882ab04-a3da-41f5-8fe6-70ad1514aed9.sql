-- Criar tabela para variações/complementos de itens
CREATE TABLE IF NOT EXISTS public.item_variations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'sauce', 'border', 'extra', 'size', 'custom'
  price_adjustment NUMERIC DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar horários de funcionamento aos itens do menu
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS available_hours JSONB DEFAULT '{"start": "00:00", "end": "23:59", "days": [0,1,2,3,4,5,6]}'::jsonb,
ADD COLUMN IF NOT EXISTS demo_images JSONB DEFAULT '[]'::jsonb;

-- Criar tabela para rastreamento de status de pedidos (notificações)
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  customer_notified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.item_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Políticas para item_variations
CREATE POLICY "Anyone can view active variations" 
ON public.item_variations 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage variations" 
ON public.item_variations 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para order_status_history
CREATE POLICY "Public can view own order status history" 
ON public.order_status_history 
FOR SELECT 
USING (true);

CREATE POLICY "Staff can insert status history" 
ON public.order_status_history 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'waiter'::app_role));

-- Trigger para criar histórico de status automaticamente
CREATE OR REPLACE FUNCTION public.track_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (order_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_status_change_trigger
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.track_order_status_change();

-- Trigger para atualizar updated_at em item_variations
CREATE TRIGGER update_item_variations_updated_at
BEFORE UPDATE ON public.item_variations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir variações demo para pizzas
INSERT INTO public.item_variations (menu_item_id, name, type, price_adjustment, is_required) 
SELECT 
  id,
  'Borda Catupiry',
  'border',
  8.00,
  false
FROM public.menu_items
WHERE name ILIKE '%pizza%'
ON CONFLICT DO NOTHING;

INSERT INTO public.item_variations (menu_item_id, name, type, price_adjustment, is_required) 
SELECT 
  id,
  'Borda Cheddar',
  'border',
  6.00,
  false
FROM public.menu_items
WHERE name ILIKE '%pizza%'
ON CONFLICT DO NOTHING;

-- Inserir variações demo para hambúrgueres  
INSERT INTO public.item_variations (menu_item_id, name, type, price_adjustment, is_required) 
SELECT 
  id,
  variation,
  'sauce',
  0,
  false
FROM public.menu_items
CROSS JOIN (
  VALUES ('Ketchup'), ('Mostarda'), ('Maionese'), ('Barbecue'), ('Molho Especial')
) AS v(variation)
WHERE name ILIKE '%hamburguer%' OR name ILIKE '%burger%'
ON CONFLICT DO NOTHING;