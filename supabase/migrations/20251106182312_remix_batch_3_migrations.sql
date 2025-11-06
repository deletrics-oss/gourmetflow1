
-- Migration: 20251106043619

-- Migration: 20251106030356

-- Migration: 20251106025900
-- Criar tipo ENUM para roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'kitchen', 'waiter');

-- Criar tipo ENUM para status de pedidos
CREATE TYPE public.order_status AS ENUM ('new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled');

-- Criar tipo ENUM para tipo de entrega
CREATE TYPE public.delivery_type AS ENUM ('delivery', 'pickup', 'dine_in');

-- Criar tipo ENUM para método de pagamento
CREATE TYPE public.payment_method AS ENUM ('cash', 'credit_card', 'debit_card', 'pix', 'paghiper', 'pending');

-- Criar tipo ENUM para status de mesa
CREATE TYPE public.table_status AS ENUM ('free', 'occupied', 'reserved');

-- Tabela de perfis de usuário (estende auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela de roles de usuário
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Função para verificar role do usuário (security definer para evitar RLS recursivo)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Tabela de categorias do cardápio
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de itens do cardápio
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price DECIMAL(10,2) NOT NULL,
  promotional_price DECIMAL(10,2),
  preparation_time INTEGER DEFAULT 20,
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de mesas
CREATE TABLE public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER NOT NULL UNIQUE,
  status table_status DEFAULT 'free',
  capacity INTEGER DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de pedidos
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_phone TEXT,
  customer_cpf TEXT,
  delivery_type delivery_type NOT NULL,
  status order_status DEFAULT 'new',
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  subtotal DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  service_fee DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  payment_method payment_method DEFAULT 'pending',
  delivery_address JSONB,
  notes TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de itens do pedido
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de estoque
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL,
  current_quantity DECIMAL(10,2) DEFAULT 0,
  min_quantity DECIMAL(10,2) DEFAULT 0,
  alert_sent BOOLEAN DEFAULT false,
  last_alert_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de configurações do restaurante
CREATE TABLE public.restaurant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  instagram TEXT,
  logo_url TEXT,
  cnpj_cpf TEXT,
  responsible_name TEXT,
  segment TEXT,
  address JSONB,
  business_hours JSONB,
  delivery_options JSONB,
  dine_in_settings JSONB,
  payment_methods JSONB,
  accept_scheduled_orders BOOLEAN DEFAULT false,
  whatsapp_api_key TEXT,
  paghiper_api_key TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies para profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies para user_roles  
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para categories (todos podem ver, admins gerenciam)
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.categories FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para menu_items
CREATE POLICY "Anyone can view menu items"
  ON public.menu_items FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage menu items"
  ON public.menu_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para tables
CREATE POLICY "Anyone can view tables"
  ON public.tables FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage tables"
  ON public.tables FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'waiter')
  );

-- RLS Policies para orders
CREATE POLICY "Staff can view all orders"
  ON public.orders FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'kitchen') OR
    public.has_role(auth.uid(), 'waiter')
  );

CREATE POLICY "Staff can manage orders"
  ON public.orders FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'waiter')
  );

-- RLS Policies para order_items
CREATE POLICY "Staff can view order items"
  ON public.order_items FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'kitchen') OR
    public.has_role(auth.uid(), 'waiter')
  );

CREATE POLICY "Staff can manage order items"
  ON public.order_items FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'waiter')
  );

-- RLS Policies para inventory
CREATE POLICY "Staff can view inventory"
  ON public.inventory FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins can manage inventory"
  ON public.inventory FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para restaurant_settings
CREATE POLICY "Staff can view settings"
  ON public.restaurant_settings FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins can manage settings"
  ON public.restaurant_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tables_updated_at BEFORE UPDATE ON public.tables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_restaurant_settings_updated_at BEFORE UPDATE ON public.restaurant_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Se for o primeiro usuário, torna admin
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Usuários subsequentes são garçons por padrão
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'waiter');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Inserir dados demo
INSERT INTO public.categories (name, description, sort_order, is_active) VALUES
('Pizzas', 'Pizzas artesanais com massa fresca', 1, true),
('Lanches', 'Lanches deliciosos', 2, true),
('Bebidas', 'Refrigerantes, sucos e águas', 3, true),
('Sobremesas', 'Deliciosas sobremesas', 4, true);

-- Inserir mesas demo
INSERT INTO public.tables (number, capacity) VALUES
(1, 4), (2, 4), (3, 2), (4, 6), (5, 4),
(6, 4), (7, 2), (8, 4), (9, 6), (10, 4);


-- Migration: 20251106031345
-- Create user preferences table for theme and other settings
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create audio alerts table
CREATE TABLE IF NOT EXISTS public.audio_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  audio_url TEXT,
  trigger_event TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audio alerts
CREATE POLICY "Everyone can view audio alerts"
  ON public.audio_alerts FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage audio alerts"
  ON public.audio_alerts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_audio_alerts_updated_at
  BEFORE UPDATE ON public.audio_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default audio alerts
INSERT INTO public.audio_alerts (name, description, trigger_event) VALUES
  ('Novo Pedido', 'Som tocado quando um novo pedido chega', 'new_order'),
  ('Pedido Pronto', 'Som tocado quando um pedido está pronto', 'order_ready'),
  ('Atraso na Mesa', 'Som tocado quando uma mesa está com atraso', 'table_delay'),
  ('Pedido Confirmado', 'Som tocado quando um pedido é confirmado', 'order_confirmed'),
  ('Alerta de Estoque', 'Som tocado quando estoque está baixo', 'low_stock'),
  ('Atenção Máquina', 'Som de alerta geral', 'machine_alert')
ON CONFLICT DO NOTHING;

-- Migration: 20251106040830
-- Criar tabela de movimentações de caixa
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('entry', 'exit')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL,
  description TEXT,
  payment_method TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Staff can view cash movements"
  ON public.cash_movements FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Staff can insert cash movements"
  ON public.cash_movements FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'waiter'::app_role)
  );

CREATE POLICY "Admins can manage cash movements"
  ON public.cash_movements FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_cash_movements_updated_at
  BEFORE UPDATE ON public.cash_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela de configurações de monitor
CREATE TABLE IF NOT EXISTS public.monitor_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_type TEXT NOT NULL UNIQUE CHECK (monitor_type IN ('kitchen', 'manager')),
  slide_duration INTEGER NOT NULL DEFAULT 5,
  audio_enabled BOOLEAN DEFAULT true,
  audio_volume INTEGER DEFAULT 70 CHECK (audio_volume >= 0 AND audio_volume <= 100),
  slides_config JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.monitor_settings ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Admins can manage monitor settings"
  ON public.monitor_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view monitor settings"
  ON public.monitor_settings FOR SELECT
  USING (true);

-- Trigger
CREATE TRIGGER update_monitor_settings_updated_at
  BEFORE UPDATE ON public.monitor_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para pedidos
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;


-- Migration: 20251106180146
-- Customers & Suppliers + Public web order policies

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  name text NOT NULL,
  phone text NOT NULL,
  cpf text,
  address jsonb,
  notes text
);

-- Unique index on phone for quick upsert
CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_key ON public.customers (phone);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  name text NOT NULL,
  phone text,
  email text,
  cnpj_cpf text,
  address jsonb,
  notes text
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Timestamp trigger function already exists: public.update_updated_at_column
-- Attach triggers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_customers_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_suppliers_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Policies for customers
DROP POLICY IF EXISTS "Staff can manage customers" ON public.customers;
CREATE POLICY "Staff can manage customers"
ON public.customers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Public can insert customers" ON public.customers;
CREATE POLICY "Public can insert customers"
ON public.customers
FOR INSERT
WITH CHECK (true);

-- Policies for suppliers (staff only)
DROP POLICY IF EXISTS "Staff can manage suppliers" ON public.suppliers;
CREATE POLICY "Staff can manage suppliers"
ON public.suppliers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- PUBLIC ORDER POLICIES to allow web checkout
-- Allow public to insert orders (web + QR code)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='Public can create orders'
  ) THEN
    CREATE POLICY "Public can create orders"
    ON public.orders
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- Allow public to read orders (needed for "Meus Pedidos" and PDV listing)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='Anyone can view orders (public)'
  ) THEN
    CREATE POLICY "Anyone can view orders (public)"
    ON public.orders
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Allow public to insert/select order_items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='Public can insert order_items'
  ) THEN
    CREATE POLICY "Public can insert order_items"
    ON public.order_items
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='Anyone can view order_items (public)'
  ) THEN
    CREATE POLICY "Anyone can view order_items (public)"
    ON public.order_items
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Migration: 20251106180241
-- Customers & Suppliers + Public web order policies

-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  name text NOT NULL,
  phone text NOT NULL,
  cpf text,
  address jsonb,
  notes text
);

-- Unique index on phone for quick upsert
CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_key ON public.customers (phone);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  name text NOT NULL,
  phone text,
  email text,
  cnpj_cpf text,
  address jsonb,
  notes text
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Timestamp trigger function already exists: public.update_updated_at_column
-- Attach triggers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_customers_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_suppliers_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_suppliers_updated_at
    BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Policies for customers
DROP POLICY IF EXISTS "Staff can manage customers" ON public.customers;
CREATE POLICY "Staff can manage customers"
ON public.customers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

DROP POLICY IF EXISTS "Public can insert customers" ON public.customers;
CREATE POLICY "Public can insert customers"
ON public.customers
FOR INSERT
WITH CHECK (true);

-- Policies for suppliers (staff only)
DROP POLICY IF EXISTS "Staff can manage suppliers" ON public.suppliers;
CREATE POLICY "Staff can manage suppliers"
ON public.suppliers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- PUBLIC ORDER POLICIES to allow web checkout
-- Allow public to insert orders (web + QR code)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='Public can create orders'
  ) THEN
    CREATE POLICY "Public can create orders"
    ON public.orders
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- Allow public to read orders (needed for "Meus Pedidos" and PDV listing)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='Anyone can view orders (public)'
  ) THEN
    CREATE POLICY "Anyone can view orders (public)"
    ON public.orders
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- Allow public to insert/select order_items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='Public can insert order_items'
  ) THEN
    CREATE POLICY "Public can insert order_items"
    ON public.order_items
    FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='Anyone can view order_items (public)'
  ) THEN
    CREATE POLICY "Anyone can view order_items (public)"
    ON public.order_items
    FOR SELECT
    USING (true);
  END IF;
END $$;
