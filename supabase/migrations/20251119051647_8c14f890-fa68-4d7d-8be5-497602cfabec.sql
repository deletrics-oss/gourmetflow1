-- Criar tabela de zonas de entrega
CREATE TABLE public.delivery_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  min_distance NUMERIC NOT NULL DEFAULT 0,
  max_distance NUMERIC NOT NULL,
  fee NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Restaurant staff can manage delivery zones"
ON public.delivery_zones
FOR ALL
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM user_restaurants 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Anyone can view delivery zones"
ON public.delivery_zones
FOR SELECT
USING (true);

-- Adicionar campos de latitude e longitude à tabela restaurant_settings
ALTER TABLE public.restaurant_settings
ADD COLUMN latitude NUMERIC,
ADD COLUMN longitude NUMERIC,
ADD COLUMN max_delivery_radius NUMERIC DEFAULT 50;

-- Criar índice para melhor performance
CREATE INDEX idx_delivery_zones_restaurant ON public.delivery_zones(restaurant_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_delivery_zones_updated_at
BEFORE UPDATE ON public.delivery_zones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();