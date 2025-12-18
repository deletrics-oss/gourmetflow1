-- WhatsApp Integration Complete Tables

-- 1. Broadcasts table
CREATE TABLE IF NOT EXISTS public.whatsapp_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.whatsapp_devices(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  media_urls JSONB DEFAULT '[]',
  status TEXT DEFAULT 'draft',
  total_contacts INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  delay_seconds INTEGER DEFAULT 20,
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Broadcast contacts table
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

-- 3. Reminders table
CREATE TABLE IF NOT EXISTS public.whatsapp_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_days INTEGER DEFAULT 7,
  is_active BOOLEAN DEFAULT true,
  send_time TEXT DEFAULT '10:00',
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Opt-outs table (LGPD)
CREATE TABLE IF NOT EXISTS public.whatsapp_opt_outs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  opted_out_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT,
  UNIQUE(restaurant_id, phone)
);

-- 5. WhatsApp Cart table
CREATE TABLE IF NOT EXISTS public.whatsapp_cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  items JSONB DEFAULT '[]',
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  conversation_state TEXT DEFAULT 'initial',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '2 hours'),
  UNIQUE(restaurant_id, phone)
);

-- 6. Templates table
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'broadcast',
  variables JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Add columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS whatsapp_notified BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery_time TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'system';

-- 8. Add columns to restaurant_settings table
ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS owner_whatsapp TEXT;
ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS whatsapp_group_id TEXT;
ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS notify_owner_new_order BOOLEAN DEFAULT true;
ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS notify_owner_cancellation BOOLEAN DEFAULT true;
ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS notify_owner_complaint BOOLEAN DEFAULT true;
ALTER TABLE public.restaurant_settings ADD COLUMN IF NOT EXISTS whatsapp_server_url TEXT;

-- Enable RLS
ALTER TABLE public.whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_broadcast_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whatsapp_broadcasts
CREATE POLICY "Users can manage own restaurant broadcasts" ON public.whatsapp_broadcasts
  FOR ALL USING (restaurant_id IN (
    SELECT restaurant_id FROM public.user_restaurants 
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- RLS Policies for whatsapp_broadcast_contacts
CREATE POLICY "Users can manage broadcast contacts" ON public.whatsapp_broadcast_contacts
  FOR ALL USING (broadcast_id IN (
    SELECT id FROM public.whatsapp_broadcasts 
    WHERE restaurant_id IN (
      SELECT restaurant_id FROM public.user_restaurants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  ));

-- RLS Policies for whatsapp_reminders
CREATE POLICY "Users can manage own restaurant reminders" ON public.whatsapp_reminders
  FOR ALL USING (restaurant_id IN (
    SELECT restaurant_id FROM public.user_restaurants 
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- RLS Policies for whatsapp_opt_outs
CREATE POLICY "Users can manage own restaurant opt_outs" ON public.whatsapp_opt_outs
  FOR ALL USING (restaurant_id IN (
    SELECT restaurant_id FROM public.user_restaurants 
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- RLS Policies for whatsapp_cart
CREATE POLICY "Users can manage own restaurant cart" ON public.whatsapp_cart
  FOR ALL USING (restaurant_id IN (
    SELECT restaurant_id FROM public.user_restaurants 
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- Public access for webhook processing
CREATE POLICY "Allow public cart access for webhook" ON public.whatsapp_cart
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for whatsapp_templates
CREATE POLICY "Users can manage own restaurant templates" ON public.whatsapp_templates
  FOR ALL USING (restaurant_id IN (
    SELECT restaurant_id FROM public.user_restaurants 
    WHERE user_id = auth.uid() AND is_active = true
  ));

-- Enable realtime for broadcasts
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_broadcasts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_broadcast_contacts;