-- =============================================
-- MULTI-TENANCY SETUP - RESTAURANT ISOLATION
-- =============================================

-- 1. Criar tabela de restaurantes (tenants)
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  
  -- Endereço
  street TEXT,
  number TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  zipcode TEXT,
  complement TEXT,
  
  -- Configurações
  settings JSONB DEFAULT '{}',
  
  -- Subscription
  subscription_id UUID REFERENCES public.subscriptions(id),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Criar tabela de relacionamento usuário-restaurante
CREATE TABLE IF NOT EXISTS public.user_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff', -- owner, admin, manager, staff
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, restaurant_id)
);

-- 3. Adicionar restaurant_id às tabelas existentes
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.motoboys ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);
ALTER TABLE public.cash_movements ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id);

-- 4. Criar tabela de logs do sistema
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT, -- order, menu_item, customer, etc
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_restaurants_owner ON public.restaurants(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_user_restaurants_user ON public.user_restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_restaurants_restaurant ON public.user_restaurants(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant ON public.orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_categories_restaurant ON public.categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_customers_restaurant ON public.customers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_restaurant ON public.system_logs(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_user ON public.system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON public.system_logs(created_at DESC);

-- 6. Habilitar RLS nas novas tabelas
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS para restaurants
CREATE POLICY "Users can view their restaurants" ON public.restaurants
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_restaurants 
      WHERE restaurant_id = id AND is_active = true
    )
  );

CREATE POLICY "Restaurant owners can update" ON public.restaurants
  FOR UPDATE USING (
    owner_user_id = auth.uid() OR
    auth.uid() IN (
      SELECT user_id FROM public.user_restaurants 
      WHERE restaurant_id = id AND role IN ('owner', 'admin') AND is_active = true
    )
  );

-- 8. Políticas RLS para user_restaurants
CREATE POLICY "Users can view their restaurant relationships" ON public.user_restaurants
  FOR SELECT USING (user_id = auth.uid());

-- 9. Políticas RLS para system_logs
CREATE POLICY "Users can view logs from their restaurants" ON public.system_logs
  FOR SELECT USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_restaurants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "System can insert logs" ON public.system_logs
  FOR INSERT WITH CHECK (true);

-- 10. Função para obter restaurant_id do usuário atual
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id UUID;
BEGIN
  SELECT restaurant_id INTO v_restaurant_id
  FROM public.user_restaurants
  WHERE user_id = auth.uid()
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN v_restaurant_id;
END;
$$;

-- 11. Função helper para log de ações
CREATE OR REPLACE FUNCTION public.log_action(
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_restaurant_id UUID;
BEGIN
  v_restaurant_id := public.get_user_restaurant_id();
  
  INSERT INTO public.system_logs (
    restaurant_id,
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_restaurant_id,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_details
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 12. Trigger para updated_at em restaurants
CREATE TRIGGER update_restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Atualizar políticas RLS existentes para incluir restaurant_id
-- Orders
DROP POLICY IF EXISTS "Staff can manage orders" ON public.orders;
CREATE POLICY "Staff can manage orders" ON public.orders
  FOR ALL USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_restaurants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Menu Items  
DROP POLICY IF EXISTS "Admins can manage menu items" ON public.menu_items;
CREATE POLICY "Admins can manage menu items" ON public.menu_items
  FOR ALL USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_restaurants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_restaurants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Customers
DROP POLICY IF EXISTS "Staff can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can create customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can view customers" ON public.customers;

CREATE POLICY "Restaurant staff can manage customers" ON public.customers
  FOR ALL USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_restaurants 
      WHERE user_id = auth.uid() AND is_active = true
    ) OR restaurant_id IS NULL
  );

-- Tables
DROP POLICY IF EXISTS "Staff can manage tables" ON public.tables;
CREATE POLICY "Staff can manage tables" ON public.tables
  FOR ALL USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_restaurants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Motoboys
DROP POLICY IF EXISTS "Staff can manage motoboys" ON public.motoboys;
CREATE POLICY "Staff can manage motoboys" ON public.motoboys
  FOR ALL USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.user_restaurants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );