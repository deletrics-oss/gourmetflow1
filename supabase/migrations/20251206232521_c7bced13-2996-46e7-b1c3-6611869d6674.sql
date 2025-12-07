-- Tabela: Dispositivos WhatsApp conectados
CREATE TABLE public.whatsapp_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Dispositivo Principal',
  phone_number TEXT,
  connection_status TEXT DEFAULT 'disconnected',
  qr_code TEXT,
  active_logic_id UUID,
  should_transcribe BOOLEAN DEFAULT true,
  last_connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: Lógicas de automação do Bot
CREATE TABLE public.whatsapp_logic_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logic_type TEXT DEFAULT 'json',
  logic_json JSONB DEFAULT '{"rules": [], "default_reply": "Olá! Como posso ajudar?"}',
  ai_prompt TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: Conversas do WhatsApp
CREATE TABLE public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.whatsapp_devices(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  is_paused BOOLEAN DEFAULT false,
  unread_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Atualizar tabela whatsapp_messages existente
ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS device_id UUID REFERENCES public.whatsapp_devices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'incoming',
ADD COLUMN IF NOT EXISTS is_from_bot BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Atualizar active_logic_id para referência
ALTER TABLE public.whatsapp_devices 
ADD CONSTRAINT whatsapp_devices_active_logic_fkey 
FOREIGN KEY (active_logic_id) REFERENCES public.whatsapp_logic_configs(id) ON DELETE SET NULL;

-- RLS para whatsapp_devices
ALTER TABLE public.whatsapp_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own restaurant devices" ON public.whatsapp_devices
FOR ALL USING (
  restaurant_id IN (
    SELECT restaurant_id FROM public.user_restaurants 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- RLS para whatsapp_logic_configs
ALTER TABLE public.whatsapp_logic_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own restaurant logics" ON public.whatsapp_logic_configs
FOR ALL USING (
  restaurant_id IN (
    SELECT restaurant_id FROM public.user_restaurants 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- RLS para whatsapp_conversations
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own restaurant conversations" ON public.whatsapp_conversations
FOR ALL USING (
  restaurant_id IN (
    SELECT restaurant_id FROM public.user_restaurants 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_logic_configs;