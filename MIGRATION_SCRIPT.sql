-- ============================================
-- GOURMETFLOW - SCRIPT DE MIGRAÇÃO COMPLETO
-- Supabase Project: npxhdsodvboqxrauwuwy
-- Generated: 2026-01-11
-- ============================================

-- ============================================
-- PARTE 1: ENUMS
-- ============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'waiter', 'kitchen', 'delivery');
CREATE TYPE public.order_status AS ENUM ('new', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled');
CREATE TYPE public.delivery_type AS ENUM ('dine_in', 'takeout', 'delivery');
CREATE TYPE public.payment_method AS ENUM ('pending', 'cash', 'credit', 'debit', 'pix', 'voucher', 'multiple');
CREATE TYPE public.table_status AS ENUM ('free', 'occupied', 'reserved', 'cleaning');

-- ============================================
-- PARTE 2: FUNÇÕES AUXILIARES (criar antes das tabelas para RLS)
-- ============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_restaurant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- PARTE 3: TABELAS PRINCIPAIS
-- ============================================

-- Profiles (usuários)
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Subscriptions
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  plan_type text NOT NULL,
  status text NOT NULL DEFAULT 'trial',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  trial_end timestamp with time zone DEFAULT (now() + interval '10 days'),
  cancel_at_period_end boolean DEFAULT false,
  manually_blocked boolean DEFAULT false,
  blocked_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Restaurants
CREATE TABLE public.restaurants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  phone text,
  email text,
  owner_user_id uuid,
  subscription_id uuid REFERENCES public.subscriptions(id),
  settings jsonb DEFAULT '{}'::jsonb,
  street text,
  number text,
  neighborhood text,
  city text,
  state text,
  zipcode text,
  complement text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- User Restaurants (relacionamento usuário-restaurante)
CREATE TABLE public.user_restaurants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  restaurant_id uuid REFERENCES public.restaurants(id),
  role text NOT NULL DEFAULT 'staff',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Restaurant Settings
CREATE TABLE public.restaurant_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  name text NOT NULL,
  phone text,
  instagram text,
  logo_url text,
  cnpj_cpf text,
  responsible_name text,
  segment text,
  street text,
  number text,
  neighborhood text,
  city text,
  state text,
  zipcode text,
  complement text,
  latitude numeric,
  longitude numeric,
  max_delivery_radius numeric DEFAULT 50,
  address jsonb,
  business_hours jsonb,
  delivery_options jsonb,
  dine_in_settings jsonb,
  payment_methods jsonb,
  accept_scheduled_orders boolean DEFAULT false,
  loyalty_enabled boolean DEFAULT false,
  loyalty_points_per_real numeric DEFAULT 1,
  loyalty_redemption_value numeric DEFAULT 0.01,
  -- Payment Gateways
  pagseguro_enabled boolean DEFAULT false,
  pagseguro_token text,
  pagseguro_email text,
  mercadopago_enabled boolean DEFAULT false,
  mercadopago_access_token text,
  mercadopago_public_key text,
  rede_enabled boolean DEFAULT false,
  rede_pv text,
  rede_token text,
  stone_enabled boolean DEFAULT false,
  stone_merchant_id text,
  stone_api_key text,
  nubank_enabled boolean DEFAULT false,
  nubank_client_id text,
  nubank_client_secret text,
  cielo_enabled boolean DEFAULT false,
  cielo_merchant_id text,
  cielo_merchant_key text,
  -- WhatsApp/Integrations
  whatsapp_api_key text,
  whatsapp_webhook_url text,
  whatsapp_phone text,
  whatsapp_server_url text,
  whatsapp_group_id text,
  owner_whatsapp text,
  twilio_account_sid text,
  twilio_auth_token text,
  twilio_phone_number text,
  facebook_access_token text,
  facebook_business_id text,
  facebook_phone_number_id text,
  -- Delivery Platforms
  ifood_token text,
  ninefood_token text,
  keeta_token text,
  -- AI
  gemini_api_key text,
  apify_api_key text,
  paghiper_api_key text,
  -- UI Customization
  background_url text,
  background_color text DEFAULT '#f8fafc',
  primary_color text DEFAULT '#e53e3e',
  accent_color text DEFAULT '#f59e0b',
  totem_welcome_message text DEFAULT 'Bem-vindo! Faça seu pedido',
  menu_header_message text DEFAULT 'O que você deseja?',
  customer_theme text DEFAULT 'modern',
  menu_font text DEFAULT 'default',
  show_logo_on_menu boolean DEFAULT true,
  tablet_full_flow boolean DEFAULT false,
  -- Notifications
  notify_owner_new_order boolean DEFAULT true,
  notify_owner_cancellation boolean DEFAULT true,
  notify_owner_complaint boolean DEFAULT true,
  -- Status
  onboarding_completed boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Categories
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  name text NOT NULL,
  description text,
  image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Menu Items
CREATE TABLE public.menu_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  category_id uuid REFERENCES public.categories(id),
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  promotional_price numeric,
  price_per_kg numeric,
  sale_type text DEFAULT 'unit',
  image_url text,
  demo_images jsonb,
  preparation_time integer,
  available_hours jsonb,
  sort_order integer DEFAULT 0,
  is_available boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Item Variations
CREATE TABLE public.item_variations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id uuid REFERENCES public.menu_items(id),
  name text NOT NULL,
  type text NOT NULL,
  price_adjustment numeric DEFAULT 0,
  is_required boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tables (mesas)
CREATE TABLE public.tables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  number integer NOT NULL,
  capacity integer DEFAULT 4,
  status table_status DEFAULT 'free',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Comandas Fixas
CREATE TABLE public.comandas_fixas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Customers
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  name text NOT NULL,
  phone text NOT NULL,
  cpf text,
  address jsonb,
  notes text,
  loyalty_points integer DEFAULT 0,
  is_suspicious boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Motoboys
CREATE TABLE public.motoboys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  name text NOT NULL,
  phone text,
  cnh text,
  vehicle_plate text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Orders
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  order_number text NOT NULL,
  delivery_type delivery_type NOT NULL,
  status order_status DEFAULT 'new',
  table_id uuid REFERENCES public.tables(id),
  comanda_fixa_id uuid REFERENCES public.comandas_fixas(id),
  customer_id uuid REFERENCES public.customers(id),
  motoboy_id uuid REFERENCES public.motoboys(id),
  customer_name text,
  customer_phone text,
  customer_cpf text,
  delivery_address jsonb,
  subtotal numeric DEFAULT 0,
  delivery_fee numeric DEFAULT 0,
  service_fee numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  coupon_code text,
  coupon_discount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  payment_method payment_method DEFAULT 'pending',
  notes text,
  order_source text DEFAULT 'system',
  loyalty_points_earned integer DEFAULT 0,
  loyalty_points_used integer DEFAULT 0,
  number_of_guests integer DEFAULT 2,
  scheduled_for timestamp with time zone,
  estimated_delivery_time timestamp with time zone,
  whatsapp_notified boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Order Items
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id),
  menu_item_id uuid REFERENCES public.menu_items(id),
  name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Order Status History
CREATE TABLE public.order_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id),
  old_status text,
  new_status text NOT NULL,
  customer_notified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Delivery Zones
CREATE TABLE public.delivery_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  min_distance numeric DEFAULT 0,
  max_distance numeric NOT NULL,
  fee numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Coupons
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  type text NOT NULL,
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_value numeric NOT NULL DEFAULT 0,
  max_uses integer NOT NULL DEFAULT 100,
  current_uses integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Loyalty Transactions
CREATE TABLE public.loyalty_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES public.customers(id),
  order_id uuid REFERENCES public.orders(id),
  type text NOT NULL,
  points integer NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Inventory
CREATE TABLE public.inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  name text NOT NULL,
  unit text NOT NULL,
  category text,
  current_quantity numeric DEFAULT 0,
  min_quantity numeric DEFAULT 0,
  alert_sent boolean DEFAULT false,
  last_alert_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Suppliers
CREATE TABLE public.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  name text NOT NULL,
  phone text,
  email text,
  cnpj_cpf text,
  address jsonb,
  notes text,
  is_suspicious boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Expenses
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  description text NOT NULL,
  category text NOT NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  attachment_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Cash Movements
CREATE TABLE public.cash_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  type text NOT NULL,
  category text NOT NULL,
  amount numeric NOT NULL,
  description text,
  payment_method text NOT NULL,
  movement_date date DEFAULT CURRENT_DATE,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Payment History
CREATE TABLE public.payment_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid REFERENCES public.subscriptions(id),
  stripe_payment_id text,
  amount numeric NOT NULL,
  currency text DEFAULT 'BRL',
  status text NOT NULL,
  payment_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Plan Features
CREATE TABLE public.plan_features (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_type text NOT NULL,
  feature_key text NOT NULL,
  enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Access Levels
CREATE TABLE public.access_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name varchar NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- User Permissions
CREATE TABLE public.user_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  screen_path text NOT NULL,
  can_access boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- User Preferences
CREATE TABLE public.user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  theme text NOT NULL DEFAULT 'light',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- System Users (login local)
CREATE TABLE public.system_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  user_type text NOT NULL DEFAULT 'usuario',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- System User Permissions
CREATE TABLE public.system_user_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.system_users(id),
  screen_id text NOT NULL,
  screen_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- System Logs
CREATE TABLE public.system_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Audio Alerts
CREATE TABLE public.audio_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  trigger_event text NOT NULL,
  audio_url text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Monitor Settings
CREATE TABLE public.monitor_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  monitor_type text NOT NULL,
  slide_duration integer NOT NULL DEFAULT 5,
  slides_config jsonb,
  audio_enabled boolean DEFAULT true,
  audio_volume numeric DEFAULT 0.5,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- NFC-e Settings
CREATE TABLE public.nfce_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid UNIQUE REFERENCES public.restaurants(id),
  cnpj text,
  ie text,
  im text,
  regime_tributario text DEFAULT 'SN',
  environment text DEFAULT 'test',
  serie_number text DEFAULT '1',
  last_nf_number integer DEFAULT 0,
  certificate_type text,
  certificate_password text,
  certificate_data text,
  certificate_expiry timestamp with time zone,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- NFC-e Issued
CREATE TABLE public.nfce_issued (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  order_id uuid REFERENCES public.orders(id),
  nf_number text NOT NULL,
  serie text NOT NULL,
  chave_acesso text,
  xml_content text,
  status text DEFAULT 'pending',
  protocol text,
  error_message text,
  total_value numeric,
  authorization_date timestamp with time zone,
  cancellation_date timestamp with time zone,
  cancellation_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- WhatsApp Devices
CREATE TABLE public.whatsapp_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  name text NOT NULL DEFAULT 'Dispositivo Principal',
  phone_number text,
  connection_status text DEFAULT 'disconnected',
  qr_code text,
  active_logic_id uuid,
  should_transcribe boolean DEFAULT true,
  last_connected_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- WhatsApp Logic Configs
CREATE TABLE public.whatsapp_logic_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  name text NOT NULL,
  description text,
  logic_type text DEFAULT 'json',
  logic_json jsonb DEFAULT '{"rules": [], "default_reply": "Olá! Como posso ajudar?"}'::jsonb,
  ai_prompt text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- WhatsApp Messages
CREATE TABLE public.whatsapp_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  device_id uuid REFERENCES public.whatsapp_devices(id),
  conversation_id uuid,
  phone_number text NOT NULL,
  message_content text NOT NULL,
  remetente text NOT NULL,
  message_type text NOT NULL DEFAULT 'texto',
  direction text DEFAULT 'incoming',
  media_url text,
  media_type text,
  ai_response text,
  is_from_bot boolean DEFAULT false,
  processado boolean DEFAULT false,
  received_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- WhatsApp Appointments
CREATE TABLE public.whatsapp_appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number text NOT NULL,
  customer_name text,
  appointment_type text,
  appointment_date timestamp with time zone,
  status text DEFAULT 'pendente',
  notas text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- WhatsApp Broadcasts
CREATE TABLE public.whatsapp_broadcasts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  device_id uuid REFERENCES public.whatsapp_devices(id),
  name text NOT NULL,
  message text NOT NULL,
  media_urls jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'draft',
  total_contacts integer DEFAULT 0,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  delay_seconds integer DEFAULT 20,
  scheduled_for timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- WhatsApp Reminders
CREATE TABLE public.whatsapp_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  name text NOT NULL,
  message_template text NOT NULL,
  trigger_type text NOT NULL,
  trigger_days integer DEFAULT 7,
  send_time text DEFAULT '10:00',
  is_active boolean DEFAULT true,
  last_run_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- PARTE 4: VIEWS
-- ============================================

CREATE OR REPLACE VIEW public.customer_order_history AS
SELECT 
  c.id as customer_id,
  c.name,
  c.phone,
  COUNT(o.id) as total_orders,
  COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_orders,
  COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled_orders,
  MAX(o.created_at) as last_order_date,
  SUM(CASE WHEN o.status = 'completed' THEN o.total ELSE 0 END) as total_spent
FROM public.customers c
LEFT JOIN public.orders o ON o.customer_id = c.id
GROUP BY c.id, c.name, c.phone;

-- ============================================
-- PARTE 5: FUNÇÕES ADICIONAIS
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'waiter');
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.initialize_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.subscriptions (
    user_id,
    plan_type,
    status,
    trial_end
  ) VALUES (
    NEW.id,
    'delivery1',
    'trial',
    now() + interval '30 days'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_restaurant_and_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_restaurant_id UUID;
  v_restaurant_slug TEXT;
  v_restaurant_name TEXT;
  v_invited_restaurant_id UUID;
  v_invited_role TEXT;
BEGIN
  v_invited_restaurant_id := (NEW.raw_user_meta_data->>'invited_by_restaurant')::uuid;
  v_invited_role := COALESCE(NEW.raw_user_meta_data->>'invited_role', 'staff');
  
  IF v_invited_restaurant_id IS NOT NULL THEN
    INSERT INTO public.user_restaurants (
      user_id,
      restaurant_id,
      role,
      is_active
    ) VALUES (
      NEW.id,
      v_invited_restaurant_id,
      v_invited_role,
      true
    );
    RETURN NEW;
  END IF;
  
  v_restaurant_slug := 'rest-' || substring(md5(NEW.id::text) from 1 for 8);
  v_restaurant_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Meu Restaurante');
  
  INSERT INTO public.restaurants (
    name,
    slug,
    email,
    owner_user_id,
    is_active
  ) VALUES (
    v_restaurant_name,
    v_restaurant_slug,
    NEW.email,
    NEW.id,
    true
  ) RETURNING id INTO v_restaurant_id;
  
  INSERT INTO public.user_restaurants (
    user_id,
    restaurant_id,
    role,
    is_active
  ) VALUES (
    NEW.id,
    v_restaurant_id,
    'owner',
    true
  );
  
  INSERT INTO public.restaurant_settings (
    restaurant_id,
    name
  ) VALUES (
    v_restaurant_id,
    v_restaurant_name
  );
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (order_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_table_status_on_order_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled') AND OLD.status NOT IN ('completed', 'cancelled') AND NEW.table_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.orders 
      WHERE table_id = NEW.table_id 
      AND status NOT IN ('completed', 'cancelled')
      AND id != NEW.id
    ) THEN
      UPDATE public.tables 
      SET status = 'free' 
      WHERE id = NEW.table_id;
      
      INSERT INTO public.system_logs (action, entity_type, entity_id, details)
      VALUES (
        'table_auto_freed',
        'tables',
        NEW.table_id,
        jsonb_build_object(
          'reason', 'all_orders_completed',
          'order_id', NEW.id,
          'order_number', NEW.order_number
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_action(
  p_action text, 
  p_entity_type text DEFAULT NULL, 
  p_entity_id uuid DEFAULT NULL, 
  p_details jsonb DEFAULT NULL, 
  p_restaurant_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  INSERT INTO public.system_logs (
    action, 
    entity_type, 
    entity_id, 
    details, 
    user_id, 
    restaurant_id,
    created_at
  ) VALUES (
    p_action, 
    p_entity_type, 
    p_entity_id, 
    p_details, 
    v_user_id, 
    p_restaurant_id,
    now()
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to log action: %', SQLERRM;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_subscription_block(
  p_subscription_id uuid, 
  p_blocked boolean, 
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.subscriptions
  SET 
    manually_blocked = p_blocked,
    blocked_reason = p_reason,
    updated_at = now()
  WHERE id = p_subscription_id;
  
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.invite_employee(
  p_email text, 
  p_full_name text, 
  p_role text DEFAULT 'staff', 
  p_restaurant_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_restaurant_id UUID;
BEGIN
  IF p_restaurant_id IS NULL THEN
    SELECT restaurant_id INTO v_restaurant_id
    FROM public.user_restaurants
    WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('owner', 'admin')
    ORDER BY created_at ASC
    LIMIT 1;
  ELSE
    v_restaurant_id := p_restaurant_id;
  END IF;
  
  IF v_restaurant_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Restaurante não encontrado ou sem permissão');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'restaurant_id', v_restaurant_id,
    'metadata', json_build_object(
      'full_name', p_full_name,
      'invited_by_restaurant', v_restaurant_id,
      'invited_role', p_role
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_subscriptions()
RETURNS TABLE(
  id uuid, 
  user_id uuid, 
  restaurant_name text, 
  restaurant_phone text, 
  restaurant_email text, 
  plan_type text, 
  status text, 
  stripe_customer_id text, 
  stripe_subscription_id text, 
  current_period_start timestamp with time zone, 
  current_period_end timestamp with time zone, 
  trial_end timestamp with time zone, 
  manually_blocked boolean, 
  blocked_reason text, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  detailed_status text, 
  trial_days_left integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can access this function';
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    p.full_name as restaurant_name,
    p.phone as restaurant_phone,
    u.email as restaurant_email,
    s.plan_type::text,
    s.status::text,
    s.stripe_customer_id,
    s.stripe_subscription_id,
    s.current_period_start,
    s.current_period_end,
    s.trial_end,
    s.manually_blocked,
    s.blocked_reason,
    s.created_at,
    s.updated_at,
    CASE 
      WHEN s.status = 'trial' AND s.trial_end < now() THEN 'expired_trial'::text
      WHEN s.status = 'trial' AND s.trial_end >= now() THEN 'active_trial'::text
      WHEN s.status = 'past_due' THEN 'payment_overdue'::text
      WHEN s.status = 'active' THEN 'active_paid'::text
      WHEN s.manually_blocked = true THEN 'blocked_manual'::text
      ELSE s.status::text
    END as detailed_status,
    CASE
      WHEN s.status = 'trial' THEN EXTRACT(DAY FROM (s.trial_end - now()))::integer
      ELSE NULL
    END as trial_days_left
  FROM public.subscriptions s
  LEFT JOIN public.profiles p ON p.user_id = s.user_id
  LEFT JOIN auth.users u ON u.id = s.user_id
  ORDER BY s.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_subscription_payments(p_subscription_id uuid)
RETURNS TABLE(
  id uuid, 
  stripe_payment_id text, 
  amount numeric, 
  currency text, 
  status text, 
  payment_date timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.subscriptions 
      WHERE subscriptions.id = p_subscription_id 
      AND subscriptions.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;

  RETURN QUERY
  SELECT 
    ph.id,
    ph.stripe_payment_id,
    ph.amount,
    ph.currency,
    ph.status,
    ph.payment_date
  FROM public.payment_history ph
  WHERE ph.subscription_id = p_subscription_id
  ORDER BY ph.payment_date DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_nfce_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- PARTE 6: TRIGGERS
-- ============================================

-- Trigger para novos usuários (criar profile e role)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para criar subscription
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_user_subscription();

-- Trigger para criar restaurante
CREATE TRIGGER on_auth_user_created_restaurant
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_restaurant_and_trial();

-- Trigger para histórico de status de pedidos
CREATE TRIGGER track_order_status
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.track_order_status_change();

-- Trigger para liberar mesa automaticamente
CREATE TRIGGER update_table_on_order_complete
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_table_status_on_order_complete();

-- Trigger para atualizar updated_at em nfce_issued
CREATE TRIGGER update_nfce_issued_updated_at
  BEFORE UPDATE ON public.nfce_issued
  FOR EACH ROW EXECUTE FUNCTION public.update_nfce_updated_at();

-- ============================================
-- PARTE 7: RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comandas_fixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoboys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitor_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfce_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfce_issued ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logic_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_reminders ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User Roles Policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Subscriptions Policies
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Restaurants Policies
CREATE POLICY "Users can view their restaurants" ON public.restaurants FOR SELECT 
  USING (auth.uid() IN (SELECT user_id FROM public.user_restaurants WHERE restaurant_id = restaurants.id AND is_active = true));
CREATE POLICY "Restaurant owners can update" ON public.restaurants FOR UPDATE 
  USING (owner_user_id = auth.uid() OR auth.uid() IN (
    SELECT user_id FROM public.user_restaurants 
    WHERE restaurant_id = restaurants.id AND role IN ('owner', 'admin') AND is_active = true
  ));

-- User Restaurants Policies
CREATE POLICY "Users can view their restaurant relationships" ON public.user_restaurants FOR SELECT USING (user_id = auth.uid());

-- Restaurant Settings Policies
CREATE POLICY "Users can view own restaurant settings" ON public.restaurant_settings FOR SELECT 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Owners can manage own restaurant settings" ON public.restaurant_settings FOR ALL 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true))
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND role IN ('owner', 'admin') AND is_active = true));

-- Categories Policies
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true));

-- Menu Items Policies
CREATE POLICY "Anyone can view menu items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Staff can manage menu items" ON public.menu_items FOR ALL 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true));

-- Item Variations Policies
CREATE POLICY "Anyone can view item variations" ON public.item_variations FOR SELECT USING (true);
CREATE POLICY "Staff can manage item variations" ON public.item_variations FOR ALL 
  USING (menu_item_id IN (SELECT id FROM public.menu_items WHERE restaurant_id IN (
    SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true
  )));

-- Tables Policies
CREATE POLICY "Anyone can view tables" ON public.tables FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert tables" ON public.tables FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update tables" ON public.tables FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete free tables" ON public.tables FOR DELETE USING (status = 'free');

-- Comandas Fixas Policies
CREATE POLICY "Anyone can view comandas fixas" ON public.comandas_fixas FOR SELECT USING (true);
CREATE POLICY "Staff can manage comandas fixas" ON public.comandas_fixas FOR ALL 
  USING (EXISTS (SELECT 1 FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true));

-- Customers Policies
CREATE POLICY "Restaurant staff can manage customers" ON public.customers FOR ALL 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true));

-- Motoboys Policies
CREATE POLICY "Staff can manage motoboys" ON public.motoboys FOR ALL 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true));

-- Orders Policies
CREATE POLICY "Anyone can view orders (public)" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "authenticated_can_update_orders" ON public.orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Staff can manage orders" ON public.orders FOR ALL 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true));

-- Order Items Policies
CREATE POLICY "Anyone can view order_items (public)" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Public can insert order_items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff can manage order items" ON public.order_items FOR ALL 
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'waiter'));

-- Order Status History Policies
CREATE POLICY "Public can view own order status history" ON public.order_status_history FOR SELECT USING (true);
CREATE POLICY "Staff can insert status history" ON public.order_status_history FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'waiter'));

-- Delivery Zones Policies
CREATE POLICY "Anyone can view delivery zones" ON public.delivery_zones FOR SELECT USING (true);
CREATE POLICY "Staff can manage delivery zones" ON public.delivery_zones FOR ALL 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true));

-- Coupons Policies
CREATE POLICY "Anyone can view active coupons" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Loyalty Transactions Policies
CREATE POLICY "Customers can view own loyalty transactions" ON public.loyalty_transactions FOR SELECT USING (true);
CREATE POLICY "Staff can manage loyalty transactions" ON public.loyalty_transactions FOR ALL 
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Inventory Policies
CREATE POLICY "Staff can manage inventory" ON public.inventory FOR ALL 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true));

-- Suppliers Policies
CREATE POLICY "Staff can manage suppliers" ON public.suppliers FOR ALL 
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Expenses Policies
CREATE POLICY "Staff can manage expenses" ON public.expenses FOR ALL 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin', 'manager')))
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'admin', 'manager')));

-- Cash Movements Policies
CREATE POLICY "Admins can manage cash movements" ON public.cash_movements FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can view cash movements" ON public.cash_movements FOR SELECT 
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Staff can insert cash movements" ON public.cash_movements FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'waiter'));

-- Payment History Policies
CREATE POLICY "Users can view own payment history" ON public.payment_history FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.subscriptions WHERE id = payment_history.subscription_id AND user_id = auth.uid()));
CREATE POLICY "Admins can view all payment history" ON public.payment_history FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- Plan Features Policies
CREATE POLICY "Anyone can view plan features" ON public.plan_features FOR SELECT USING (true);
CREATE POLICY "Admins can manage plan features" ON public.plan_features FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Access Levels Policies
CREATE POLICY "Admins can manage access levels" ON public.access_levels FOR ALL 
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- User Permissions Policies
CREATE POLICY "Users can view their own permissions" ON public.user_permissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all permissions" ON public.user_permissions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- User Preferences Policies
CREATE POLICY "Users can manage own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- System Users Policies
CREATE POLICY "Usuários podem ver próprio perfil" ON public.system_users FOR SELECT USING (true);
CREATE POLICY "Admins podem gerenciar usuários do sistema" ON public.system_users FOR ALL USING (has_role(auth.uid(), 'admin'));

-- System User Permissions Policies
CREATE POLICY "Staff can view system user permissions" ON public.system_user_permissions FOR SELECT USING (true);
CREATE POLICY "Admins can manage system user permissions" ON public.system_user_permissions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- System Logs Policies
CREATE POLICY "Admins can view all logs" ON public.system_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can insert logs" ON public.system_logs FOR INSERT WITH CHECK (true);

-- Audio Alerts Policies
CREATE POLICY "Anyone can view audio alerts" ON public.audio_alerts FOR SELECT USING (true);
CREATE POLICY "Admins can manage audio alerts" ON public.audio_alerts FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Monitor Settings Policies
CREATE POLICY "Anyone can view monitor settings" ON public.monitor_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage monitor settings" ON public.monitor_settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- NFC-e Settings Policies
CREATE POLICY "Users can view their restaurant nfce_settings" ON public.nfce_settings FOR SELECT 
  USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "Users can insert their restaurant nfce_settings" ON public.nfce_settings FOR INSERT 
  WITH CHECK (restaurant_id = get_user_restaurant_id());
CREATE POLICY "Users can update their restaurant nfce_settings" ON public.nfce_settings FOR UPDATE 
  USING (restaurant_id = get_user_restaurant_id());

-- NFC-e Issued Policies
CREATE POLICY "Users can view their restaurant nfce_issued" ON public.nfce_issued FOR SELECT 
  USING (restaurant_id = get_user_restaurant_id());
CREATE POLICY "Users can insert nfce_issued" ON public.nfce_issued FOR INSERT 
  WITH CHECK (restaurant_id = get_user_restaurant_id());
CREATE POLICY "Users can update nfce_issued" ON public.nfce_issued FOR UPDATE 
  USING (restaurant_id = get_user_restaurant_id());

-- WhatsApp Devices Policies
CREATE POLICY "Users can manage own restaurant devices" ON public.whatsapp_devices FOR ALL 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true));

-- WhatsApp Logic Configs Policies
CREATE POLICY "Users can manage own restaurant logics" ON public.whatsapp_logic_configs FOR ALL 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true));

-- WhatsApp Messages Policies
CREATE POLICY "Permitir acesso público a whatsapp_messages" ON public.whatsapp_messages FOR ALL 
  USING (true) WITH CHECK (true);

-- WhatsApp Appointments Policies
CREATE POLICY "Permitir acesso público a whatsapp_appointments" ON public.whatsapp_appointments FOR ALL 
  USING (true) WITH CHECK (true);

-- WhatsApp Broadcasts Policies
CREATE POLICY "Users can manage own restaurant broadcasts" ON public.whatsapp_broadcasts FOR ALL 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true));

-- WhatsApp Reminders Policies
CREATE POLICY "Users can manage own restaurant reminders" ON public.whatsapp_reminders FOR ALL 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true));

-- ============================================
-- PARTE 8: STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Anyone can view menu images" ON storage.objects FOR SELECT 
  USING (bucket_id = 'menu-images');
CREATE POLICY "Authenticated users can upload menu images" ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update menu images" ON storage.objects FOR UPDATE 
  USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete menu images" ON storage.objects FOR DELETE 
  USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

-- ============================================
-- PARTE 9: REALTIME (opcional)
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;

-- ============================================
-- FIM DO SCRIPT DE MIGRAÇÃO
-- ============================================
