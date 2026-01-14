-- =====================================================
-- GOURMETFLOW - SCRIPT DE MIGRAÇÃO COMPLETO v2.0
-- Projeto Destino: npxhdsodvboqxrauwuwy
-- Data: Janeiro 2026
-- 
-- ORDEM DE EXECUÇÃO CORRIGIDA:
-- 1. Extensões
-- 2. ENUMs
-- 3. Tabelas (user_roles PRIMEIRO)
-- 4. Functions
-- 5. Triggers
-- 6. RLS Policies
-- 7. Views
-- 8. Storage + Realtime
-- =====================================================

-- =====================================================
-- PARTE 1: EXTENSÕES
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PARTE 2: ENUMs (5 tipos)
-- =====================================================

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'kitchen', 'waiter');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'new', 'confirmed', 'preparing', 'ready', 
    'out_for_delivery', 'completed', 'cancelled', 
    'ready_for_payment', 'pending_receipt'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.delivery_type AS ENUM ('delivery', 'pickup', 'dine_in');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM (
    'cash', 'credit_card', 'debit_card', 'pix', 'paghiper', 'pending'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.table_status AS ENUM ('free', 'occupied', 'reserved');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- PARTE 3: TABELAS (46 tabelas em ordem de dependência)
-- CRÍTICO: user_roles é criada PRIMEIRO!
-- =====================================================

-- 1. USER_ROLES (PRIMEIRA - necessária para has_role())
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 2. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'delivery1',
  status TEXT NOT NULL DEFAULT 'trial',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  manually_blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RESTAURANTS
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  owner_user_id UUID,
  subscription_id UUID REFERENCES public.subscriptions(id),
  is_active BOOLEAN DEFAULT true,
  settings JSONB,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  zipcode TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. USER_RESTAURANTS
CREATE TABLE IF NOT EXISTS public.user_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. RESTAURANT_SETTINGS
CREATE TABLE IF NOT EXISTS public.restaurant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  logo_url TEXT,
  primary_color TEXT,
  accent_color TEXT,
  background_color TEXT,
  background_url TEXT,
  menu_font TEXT,
  menu_header_message TEXT,
  customer_theme TEXT,
  show_logo_on_menu BOOLEAN DEFAULT true,
  -- Address
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  zipcode TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  -- Business Info
  cnpj_cpf TEXT,
  responsible_name TEXT,
  segment TEXT,
  instagram TEXT,
  -- Settings
  business_hours JSONB,
  payment_methods JSONB,
  delivery_options JSONB,
  dine_in_settings JSONB,
  max_delivery_radius NUMERIC,
  accept_scheduled_orders BOOLEAN DEFAULT false,
  tablet_full_flow BOOLEAN DEFAULT false,
  totem_welcome_message TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  -- Loyalty
  loyalty_enabled BOOLEAN DEFAULT false,
  loyalty_points_per_real NUMERIC DEFAULT 1,
  loyalty_redemption_value NUMERIC DEFAULT 0.01,
  -- WhatsApp
  owner_whatsapp TEXT,
  whatsapp_phone TEXT,
  whatsapp_group_id TEXT,
  whatsapp_api_key TEXT,
  whatsapp_server_url TEXT,
  whatsapp_webhook_url TEXT,
  notify_owner_new_order BOOLEAN DEFAULT false,
  notify_owner_cancellation BOOLEAN DEFAULT false,
  notify_owner_complaint BOOLEAN DEFAULT false,
  -- Twilio
  twilio_account_sid TEXT,
  twilio_auth_token TEXT,
  twilio_phone_number TEXT,
  -- Facebook/Meta
  facebook_business_id TEXT,
  facebook_access_token TEXT,
  facebook_phone_number_id TEXT,
  -- Delivery Platforms
  ifood_token TEXT,
  ninefood_token TEXT,
  keeta_token TEXT,
  -- Payment Gateways
  mercadopago_enabled BOOLEAN DEFAULT false,
  mercadopago_access_token TEXT,
  mercadopago_public_key TEXT,
  pagseguro_enabled BOOLEAN DEFAULT false,
  pagseguro_email TEXT,
  pagseguro_token TEXT,
  cielo_enabled BOOLEAN DEFAULT false,
  cielo_merchant_id TEXT,
  cielo_merchant_key TEXT,
  rede_enabled BOOLEAN DEFAULT false,
  rede_pv TEXT,
  rede_token TEXT,
  stone_enabled BOOLEAN DEFAULT false,
  stone_api_key TEXT,
  stone_merchant_id TEXT,
  nubank_enabled BOOLEAN DEFAULT false,
  nubank_client_id TEXT,
  nubank_client_secret TEXT,
  paghiper_api_key TEXT,
  -- AI
  gemini_api_key TEXT,
  apify_api_key TEXT,
  -- Address JSON (legacy)
  address JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. PAYMENT_HISTORY
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id),
  stripe_payment_id TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'brl',
  status TEXT NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. PLAN_FEATURES
CREATE TABLE IF NOT EXISTS public.plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. ACCESS_LEVELS
CREATE TABLE IF NOT EXISTS public.access_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. MENU_ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  promotional_price NUMERIC,
  image_url TEXT,
  demo_images JSONB,
  is_available BOOLEAN DEFAULT true,
  preparation_time INTEGER,
  sort_order INTEGER DEFAULT 0,
  sale_type TEXT DEFAULT 'unit',
  price_per_kg NUMERIC,
  available_hours JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 12. ITEM_VARIATIONS
CREATE TABLE IF NOT EXISTS public.item_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price_adjustment NUMERIC DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 13. TABLES
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  capacity INTEGER DEFAULT 4,
  status public.table_status DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 14. CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  cpf TEXT,
  address JSONB,
  notes TEXT,
  loyalty_points INTEGER DEFAULT 0,
  is_suspicious BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 15. MOTOBOYS
CREATE TABLE IF NOT EXISTS public.motoboys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  vehicle_plate TEXT,
  cnh TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 16. COMANDAS_FIXAS
CREATE TABLE IF NOT EXISTS public.comandas_fixas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 17. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_cpf TEXT,
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  comanda_fixa_id UUID REFERENCES public.comandas_fixas(id) ON DELETE SET NULL,
  motoboy_id UUID REFERENCES public.motoboys(id) ON DELETE SET NULL,
  delivery_type public.delivery_type NOT NULL,
  delivery_address JSONB,
  delivery_fee NUMERIC DEFAULT 0,
  status public.order_status DEFAULT 'new',
  payment_method public.payment_method,
  subtotal NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  service_fee NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  notes TEXT,
  order_source TEXT DEFAULT 'pdv',
  scheduled_for TIMESTAMPTZ,
  estimated_delivery_time TIMESTAMPTZ,
  number_of_guests INTEGER,
  coupon_code TEXT,
  coupon_discount NUMERIC DEFAULT 0,
  loyalty_points_earned INTEGER DEFAULT 0,
  loyalty_points_used INTEGER DEFAULT 0,
  whatsapp_notified BOOLEAN DEFAULT false,
  created_by UUID,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 18. ORDER_ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. ORDER_STATUS_HISTORY
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  customer_notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 20. DELIVERY_ZONES
CREATE TABLE IF NOT EXISTS public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  min_distance NUMERIC DEFAULT 0,
  max_distance NUMERIC NOT NULL,
  fee NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 21. INVENTORY
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL,
  current_quantity NUMERIC DEFAULT 0,
  min_quantity NUMERIC DEFAULT 0,
  alert_sent BOOLEAN DEFAULT false,
  last_alert_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 22. SUPPLIERS
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  cnpj_cpf TEXT,
  address JSONB,
  notes TEXT,
  is_suspicious BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 23. EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  attachment_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 24. CASH_MOVEMENTS
CREATE TABLE IF NOT EXISTS public.cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  description TEXT,
  movement_date DATE DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 25. COUPONS
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  discount_value NUMERIC DEFAULT 0,
  min_order_value NUMERIC DEFAULT 0,
  max_uses INTEGER DEFAULT 0,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 26. LOYALTY_TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 27. NFCE_SETTINGS
CREATE TABLE IF NOT EXISTS public.nfce_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE UNIQUE,
  cnpj TEXT,
  ie TEXT,
  im TEXT,
  regime_tributario TEXT,
  environment TEXT DEFAULT 'homologacao',
  serie_number TEXT DEFAULT '1',
  last_nf_number INTEGER DEFAULT 0,
  certificate_type TEXT,
  certificate_data TEXT,
  certificate_password TEXT,
  certificate_expiry TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 28. NFCE_ISSUED
CREATE TABLE IF NOT EXISTS public.nfce_issued (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  nf_number TEXT NOT NULL,
  serie TEXT NOT NULL,
  chave_acesso TEXT,
  protocol TEXT,
  status TEXT DEFAULT 'pending',
  total_value NUMERIC,
  xml_content TEXT,
  authorization_date TIMESTAMPTZ,
  cancellation_date TIMESTAMPTZ,
  cancellation_reason TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 29. WHATSAPP_DEVICES
CREATE TABLE IF NOT EXISTS public.whatsapp_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT,
  session_id TEXT,
  connection_status TEXT DEFAULT 'disconnected',
  qr_code TEXT,
  last_connected_at TIMESTAMPTZ,
  enable_audio_transcription BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 30. WHATSAPP_CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.whatsapp_devices(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  unread_count INTEGER DEFAULT 0,
  is_paused BOOLEAN DEFAULT false,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 31. WHATSAPP_MESSAGES
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  message_content TEXT,
  media_url TEXT,
  media_type TEXT,
  direction TEXT DEFAULT 'incoming',
  remetente TEXT DEFAULT 'usuário',
  is_from_bot BOOLEAN DEFAULT false,
  processado BOOLEAN DEFAULT false,
  received_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 32. WHATSAPP_TEMPLATES
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 33. WHATSAPP_BROADCASTS
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.whatsapp_devices(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  media_urls JSONB,
  status TEXT DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  delay_seconds INTEGER DEFAULT 5,
  total_contacts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 34. WHATSAPP_BROADCAST_CONTACTS
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcast_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID REFERENCES public.whatsapp_broadcasts(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 35. WHATSAPP_CART
CREATE TABLE IF NOT EXISTS public.whatsapp_cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  items JSONB DEFAULT '[]',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 36. WHATSAPP_APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.whatsapp_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  customer_name TEXT,
  appointment_date TIMESTAMPTZ,
  appointment_type TEXT,
  status TEXT DEFAULT 'pending',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 37. WHATSAPP_REMINDERS
CREATE TABLE IF NOT EXISTS public.whatsapp_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_days INTEGER DEFAULT 7,
  message_template TEXT NOT NULL,
  send_time TIME DEFAULT '10:00:00',
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 38. WHATSAPP_LOGIC_CONFIGS
CREATE TABLE IF NOT EXISTS public.whatsapp_logic_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logic_type TEXT DEFAULT 'order',
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 39. WHATSAPP_OPT_OUTS
CREATE TABLE IF NOT EXISTS public.whatsapp_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 40. AUDIO_ALERTS
CREATE TABLE IF NOT EXISTS public.audio_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  audio_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 41. MONITOR_SETTINGS
CREATE TABLE IF NOT EXISTS public.monitor_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_type TEXT NOT NULL,
  slide_duration INTEGER DEFAULT 10,
  slides_config JSONB,
  audio_enabled BOOLEAN DEFAULT true,
  audio_volume NUMERIC DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 42. USER_PERMISSIONS
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  screen_path TEXT NOT NULL,
  can_access BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, screen_path)
);

-- 43. SYSTEM_USERS
CREATE TABLE IF NOT EXISTS public.system_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  user_type TEXT DEFAULT 'staff',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 44. SYSTEM_USER_PERMISSIONS
CREATE TABLE IF NOT EXISTS public.system_user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.system_users(id) ON DELETE CASCADE,
  screen_id TEXT NOT NULL,
  screen_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 45. SYSTEM_LOGS
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 46. USER_PREFERENCES
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  theme TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PARTE 4: FUNCTIONS (14 funções)
-- Agora user_roles já existe!
-- =====================================================

-- 1. HAS_ROLE
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 2. GET_USER_RESTAURANT_ID
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id()
RETURNS uuid
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

-- 3. UPDATE_UPDATED_AT_COLUMN
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. HANDLE_NEW_USER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
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

-- 5. INITIALIZE_USER_SUBSCRIPTION
CREATE OR REPLACE FUNCTION public.initialize_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 6. CREATE_RESTAURANT_AND_TRIAL
CREATE OR REPLACE FUNCTION public.create_restaurant_and_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id UUID;
  v_restaurant_slug TEXT;
  v_restaurant_name TEXT;
  v_invited_restaurant_id UUID;
  v_invited_role TEXT;
BEGIN
  -- Verificar se o usuário foi convidado por um restaurante existente
  v_invited_restaurant_id := (NEW.raw_user_meta_data->>'invited_by_restaurant')::uuid;
  v_invited_role := COALESCE(NEW.raw_user_meta_data->>'invited_role', 'staff');
  
  IF v_invited_restaurant_id IS NOT NULL THEN
    -- FUNCIONÁRIO: Apenas associar ao restaurante existente (não criar novo)
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
    
    -- Não criar subscription para funcionários (eles usam a do dono)
    RETURN NEW;
  END IF;
  
  -- INQUILINO: Criar novo restaurante para este usuário
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
  
  -- Associar usuário como owner do restaurante
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
  
  -- Criar configurações vazias para o restaurante
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

-- 7. TRACK_ORDER_STATUS_CHANGE
CREATE OR REPLACE FUNCTION public.track_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (order_id, old_status, new_status)
    VALUES (NEW.id, OLD.status::text, NEW.status::text);
  END IF;
  RETURN NEW;
END;
$$;

-- 8. UPDATE_TABLE_STATUS_ON_ORDER_COMPLETE
CREATE OR REPLACE FUNCTION public.update_table_status_on_order_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 9. UPDATE_NFCE_UPDATED_AT
CREATE OR REPLACE FUNCTION public.update_nfce_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 10. LOG_ACTION
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
SET search_path = public
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

-- 11. GET_ADMIN_SUBSCRIPTIONS
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
  current_period_start timestamptz, 
  current_period_end timestamptz, 
  trial_end timestamptz, 
  manually_blocked boolean, 
  blocked_reason text, 
  created_at timestamptz, 
  updated_at timestamptz, 
  detailed_status text, 
  trial_days_left integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
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

-- 12. GET_SUBSCRIPTION_PAYMENTS
CREATE OR REPLACE FUNCTION public.get_subscription_payments(p_subscription_id uuid)
RETURNS TABLE(
  id uuid, 
  stripe_payment_id text, 
  amount numeric, 
  currency text, 
  status text, 
  payment_date timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin') OR
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

-- 13. TOGGLE_SUBSCRIPTION_BLOCK
CREATE OR REPLACE FUNCTION public.toggle_subscription_block(
  p_subscription_id uuid, 
  p_blocked boolean, 
  p_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- 14. INVITE_EMPLOYEE
CREATE OR REPLACE FUNCTION public.invite_employee(
  p_email text, 
  p_full_name text, 
  p_role text DEFAULT 'staff', 
  p_restaurant_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- =====================================================
-- PARTE 5: TRIGGERS (6 triggers)
-- =====================================================

-- Trigger: Criar perfil e roles ao criar usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Criar subscription ao criar usuário
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_user_subscription();

-- Trigger: Criar restaurante ao criar usuário
DROP TRIGGER IF EXISTS on_auth_user_created_restaurant ON auth.users;
CREATE TRIGGER on_auth_user_created_restaurant
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_restaurant_and_trial();

-- Trigger: Rastrear mudanças de status de pedidos
DROP TRIGGER IF EXISTS track_order_status ON public.orders;
CREATE TRIGGER track_order_status
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.track_order_status_change();

-- Trigger: Atualizar status da mesa quando pedido é concluído
DROP TRIGGER IF EXISTS update_table_on_order_complete ON public.orders;
CREATE TRIGGER update_table_on_order_complete
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_table_status_on_order_complete();

-- Trigger: Atualizar updated_at em nfce_issued
DROP TRIGGER IF EXISTS update_nfce_issued_updated_at ON public.nfce_issued;
CREATE TRIGGER update_nfce_issued_updated_at
  BEFORE UPDATE ON public.nfce_issued
  FOR EACH ROW EXECUTE FUNCTION public.update_nfce_updated_at();

-- =====================================================
-- PARTE 6: RLS POLICIES (55+ políticas)
-- =====================================================

-- Enable RLS em todas as tabelas
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoboys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comandas_fixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfce_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfce_issued ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_broadcast_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logic_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitor_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- USER_ROLES Policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- PROFILES Policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- SUBSCRIPTIONS Policies
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions" ON public.subscriptions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RESTAURANTS Policies
CREATE POLICY "Users can view their restaurants" ON public.restaurants
  FOR SELECT USING (
    owner_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = restaurants.id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Owners can update their restaurants" ON public.restaurants
  FOR UPDATE USING (owner_user_id = auth.uid());

CREATE POLICY "Admins can manage all restaurants" ON public.restaurants
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- USER_RESTAURANTS Policies
CREATE POLICY "Users can view their restaurant associations" ON public.user_restaurants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Owners can manage their restaurant staff" ON public.user_restaurants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = user_restaurants.restaurant_id
      AND r.owner_user_id = auth.uid()
    )
  );

-- RESTAURANT_SETTINGS Policies
CREATE POLICY "Users can view their restaurant settings" ON public.restaurant_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = restaurant_settings.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Owners can update their restaurant settings" ON public.restaurant_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_settings.restaurant_id
      AND r.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can insert restaurant settings" ON public.restaurant_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_settings.restaurant_id
      AND r.owner_user_id = auth.uid()
    )
  );

-- CATEGORIES Policies
CREATE POLICY "Public can view active categories" ON public.categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Restaurant staff can manage categories" ON public.categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = categories.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- MENU_ITEMS Policies
CREATE POLICY "Public can view available menu items" ON public.menu_items
  FOR SELECT USING (is_available = true);

CREATE POLICY "Restaurant staff can manage menu items" ON public.menu_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = menu_items.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- ITEM_VARIATIONS Policies
CREATE POLICY "Public can view active variations" ON public.item_variations
  FOR SELECT USING (is_active = true);

CREATE POLICY "Staff can manage variations" ON public.item_variations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.user_restaurants ur ON ur.restaurant_id = mi.restaurant_id
      WHERE mi.id = item_variations.menu_item_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- TABLES Policies
CREATE POLICY "Restaurant staff can view tables" ON public.tables
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = tables.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage tables" ON public.tables
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = tables.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- CUSTOMERS Policies
CREATE POLICY "Restaurant staff can view customers" ON public.customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = customers.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage customers" ON public.customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = customers.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- ORDERS Policies
CREATE POLICY "Restaurant staff can view orders" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = orders.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage orders" ON public.orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = orders.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Public can insert orders" ON public.orders
  FOR INSERT WITH CHECK (true);

-- ORDER_ITEMS Policies
CREATE POLICY "Restaurant staff can view order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.user_restaurants ur ON ur.restaurant_id = o.restaurant_id
      WHERE o.id = order_items.order_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage order items" ON public.order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.user_restaurants ur ON ur.restaurant_id = o.restaurant_id
      WHERE o.id = order_items.order_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Public can insert order items" ON public.order_items
  FOR INSERT WITH CHECK (true);

-- ORDER_STATUS_HISTORY Policies
CREATE POLICY "Restaurant staff can view order history" ON public.order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.user_restaurants ur ON ur.restaurant_id = o.restaurant_id
      WHERE o.id = order_status_history.order_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- MOTOBOYS Policies
CREATE POLICY "Restaurant staff can view motoboys" ON public.motoboys
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = motoboys.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage motoboys" ON public.motoboys
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = motoboys.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- DELIVERY_ZONES Policies
CREATE POLICY "Public can view delivery zones" ON public.delivery_zones
  FOR SELECT USING (is_active = true);

CREATE POLICY "Restaurant staff can manage delivery zones" ON public.delivery_zones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = delivery_zones.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- INVENTORY Policies
CREATE POLICY "Restaurant staff can view inventory" ON public.inventory
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = inventory.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage inventory" ON public.inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = inventory.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- SUPPLIERS Policies
CREATE POLICY "Restaurant staff can view suppliers" ON public.suppliers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = suppliers.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage suppliers" ON public.suppliers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = suppliers.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- EXPENSES Policies
CREATE POLICY "Restaurant staff can view expenses" ON public.expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = expenses.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage expenses" ON public.expenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = expenses.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- CASH_MOVEMENTS Policies
CREATE POLICY "Restaurant staff can view cash movements" ON public.cash_movements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = cash_movements.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage cash movements" ON public.cash_movements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = cash_movements.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- COUPONS Policies (global, not restaurant-specific)
CREATE POLICY "Public can view active coupons" ON public.coupons
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- LOYALTY_TRANSACTIONS Policies
CREATE POLICY "Restaurant staff can view loyalty transactions" ON public.loyalty_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      JOIN public.user_restaurants ur ON ur.restaurant_id = c.restaurant_id
      WHERE c.id = loyalty_transactions.customer_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage loyalty transactions" ON public.loyalty_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      JOIN public.user_restaurants ur ON ur.restaurant_id = c.restaurant_id
      WHERE c.id = loyalty_transactions.customer_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- NFCE_SETTINGS Policies
CREATE POLICY "Restaurant owners can view nfce settings" ON public.nfce_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = nfce_settings.restaurant_id
      AND r.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Restaurant owners can manage nfce settings" ON public.nfce_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = nfce_settings.restaurant_id
      AND r.owner_user_id = auth.uid()
    )
  );

-- NFCE_ISSUED Policies
CREATE POLICY "Restaurant staff can view issued nfce" ON public.nfce_issued
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = nfce_issued.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage issued nfce" ON public.nfce_issued
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = nfce_issued.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- WHATSAPP_DEVICES Policies
CREATE POLICY "Restaurant staff can view whatsapp devices" ON public.whatsapp_devices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = whatsapp_devices.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage whatsapp devices" ON public.whatsapp_devices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = whatsapp_devices.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- WHATSAPP_CONVERSATIONS Policies
CREATE POLICY "Restaurant staff can view whatsapp conversations" ON public.whatsapp_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = whatsapp_conversations.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage whatsapp conversations" ON public.whatsapp_conversations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = whatsapp_conversations.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- WHATSAPP_MESSAGES Policies
CREATE POLICY "Restaurant staff can view whatsapp messages" ON public.whatsapp_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = whatsapp_messages.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage whatsapp messages" ON public.whatsapp_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = whatsapp_messages.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Public can insert whatsapp messages" ON public.whatsapp_messages
  FOR INSERT WITH CHECK (true);

-- WHATSAPP_TEMPLATES Policies
CREATE POLICY "Restaurant staff can view whatsapp templates" ON public.whatsapp_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = whatsapp_templates.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage whatsapp templates" ON public.whatsapp_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = whatsapp_templates.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- WHATSAPP_BROADCASTS Policies
CREATE POLICY "Restaurant staff can view whatsapp broadcasts" ON public.whatsapp_broadcasts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = whatsapp_broadcasts.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage whatsapp broadcasts" ON public.whatsapp_broadcasts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = whatsapp_broadcasts.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- WHATSAPP_BROADCAST_CONTACTS Policies
CREATE POLICY "Restaurant staff can view broadcast contacts" ON public.whatsapp_broadcast_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_broadcasts wb
      JOIN public.user_restaurants ur ON ur.restaurant_id = wb.restaurant_id
      WHERE wb.id = whatsapp_broadcast_contacts.broadcast_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage broadcast contacts" ON public.whatsapp_broadcast_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_broadcasts wb
      JOIN public.user_restaurants ur ON ur.restaurant_id = wb.restaurant_id
      WHERE wb.id = whatsapp_broadcast_contacts.broadcast_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- WHATSAPP_CART Policies
CREATE POLICY "Public can view whatsapp cart" ON public.whatsapp_cart
  FOR SELECT USING (true);

CREATE POLICY "Public can manage whatsapp cart" ON public.whatsapp_cart
  FOR ALL USING (true);

-- WHATSAPP_APPOINTMENTS Policies
CREATE POLICY "Public can view appointments" ON public.whatsapp_appointments
  FOR SELECT USING (true);

CREATE POLICY "Public can manage appointments" ON public.whatsapp_appointments
  FOR ALL USING (true);

-- WHATSAPP_REMINDERS Policies
CREATE POLICY "Restaurant staff can view reminders" ON public.whatsapp_reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = whatsapp_reminders.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage reminders" ON public.whatsapp_reminders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = whatsapp_reminders.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- WHATSAPP_LOGIC_CONFIGS Policies
CREATE POLICY "Restaurant staff can view logic configs" ON public.whatsapp_logic_configs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = whatsapp_logic_configs.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage logic configs" ON public.whatsapp_logic_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = whatsapp_logic_configs.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- WHATSAPP_OPT_OUTS Policies
CREATE POLICY "Restaurant staff can view opt outs" ON public.whatsapp_opt_outs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = whatsapp_opt_outs.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

CREATE POLICY "Restaurant staff can manage opt outs" ON public.whatsapp_opt_outs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = whatsapp_opt_outs.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    )
  );

-- AUDIO_ALERTS Policies (global)
CREATE POLICY "Public can view audio alerts" ON public.audio_alerts
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage audio alerts" ON public.audio_alerts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- MONITOR_SETTINGS Policies (global)
CREATE POLICY "Public can view monitor settings" ON public.monitor_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage monitor settings" ON public.monitor_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- USER_PERMISSIONS Policies
CREATE POLICY "Users can view own permissions" ON public.user_permissions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage permissions" ON public.user_permissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- SYSTEM_USERS Policies
CREATE POLICY "Public can view system users" ON public.system_users
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage system users" ON public.system_users
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- SYSTEM_USER_PERMISSIONS Policies
CREATE POLICY "Public can view system user permissions" ON public.system_user_permissions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage system user permissions" ON public.system_user_permissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- SYSTEM_LOGS Policies
CREATE POLICY "Restaurant staff can view logs" ON public.system_logs
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_restaurants ur
      WHERE ur.restaurant_id = system_logs.restaurant_id
      AND ur.user_id = auth.uid()
      AND ur.is_active = true
    ) OR
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "System can insert logs" ON public.system_logs
  FOR INSERT WITH CHECK (true);

-- USER_PREFERENCES Policies
CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own preferences" ON public.user_preferences
  FOR ALL USING (user_id = auth.uid());

-- COMANDAS_FIXAS Policies (global)
CREATE POLICY "Public can view comandas fixas" ON public.comandas_fixas
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage comandas fixas" ON public.comandas_fixas
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- PLAN_FEATURES Policies (global)
CREATE POLICY "Public can view plan features" ON public.plan_features
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage plan features" ON public.plan_features
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ACCESS_LEVELS Policies (global)
CREATE POLICY "Public can view access levels" ON public.access_levels
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage access levels" ON public.access_levels
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- PAYMENT_HISTORY Policies
CREATE POLICY "Users can view own payment history" ON public.payment_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.id = payment_history.subscription_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payment history" ON public.payment_history
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- PARTE 7: VIEWS
-- =====================================================

CREATE OR REPLACE VIEW public.customer_order_history AS
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  c.phone as customer_phone,
  c.restaurant_id,
  COUNT(o.id) as total_orders,
  COALESCE(SUM(o.total), 0) as total_spent,
  MAX(o.created_at) as last_order_date,
  c.loyalty_points
FROM public.customers c
LEFT JOIN public.orders o ON o.customer_id = c.id AND o.status = 'completed'
GROUP BY c.id, c.name, c.phone, c.restaurant_id, c.loyalty_points;

-- =====================================================
-- PARTE 8: STORAGE + REALTIME
-- =====================================================

-- Storage: Bucket para imagens do cardápio
INSERT INTO storage.buckets (id, name, public) 
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies para menu-images
CREATE POLICY "Public can view menu images" ON storage.objects
  FOR SELECT USING (bucket_id = 'menu-images');

CREATE POLICY "Restaurant staff can upload menu images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Restaurant staff can update menu images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'menu-images');

CREATE POLICY "Restaurant staff can delete menu images" ON storage.objects
  FOR DELETE USING (bucket_id = 'menu-images');

-- Realtime: Habilitar para tabelas principais
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_devices;

-- =====================================================
-- FIM DO SCRIPT DE MIGRAÇÃO
-- =====================================================
-- 
-- PRÓXIMOS PASSOS:
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Configure os secrets das Edge Functions:
--    - GEMINI_API_KEY
--    - WHATSAPP_SERVER_URL
-- 3. Deploy das Edge Functions via CLI
-- 
-- =====================================================
