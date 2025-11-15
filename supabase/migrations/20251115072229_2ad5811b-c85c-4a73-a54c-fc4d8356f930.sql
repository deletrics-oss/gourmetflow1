-- Tabela whatsapp_messages
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  message_content TEXT NOT NULL,
  remetente TEXT NOT NULL CHECK (remetente IN ('usuário', 'assistente')),
  message_type TEXT NOT NULL DEFAULT 'texto',
  ai_response TEXT,
  processado BOOLEAN DEFAULT FALSE,
  received_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela whatsapp_appointments
CREATE TABLE whatsapp_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  customer_name TEXT,
  appointment_date TIMESTAMPTZ,
  appointment_type TEXT,
  status TEXT DEFAULT 'pendente',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_appointments_updated_at
BEFORE UPDATE ON whatsapp_appointments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Adicionar campos de integração na tabela de configurações
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS ifood_token TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS ninefood_token TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS keeta_token TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS apify_api_key TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS whatsapp_webhook_url TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS facebook_access_token TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS facebook_business_id TEXT;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS facebook_phone_number_id TEXT;

-- RLS policies
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acesso público a whatsapp_messages" 
ON whatsapp_messages FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Permitir acesso público a whatsapp_appointments" 
ON whatsapp_appointments FOR ALL 
USING (true) 
WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
CREATE INDEX idx_whatsapp_messages_received ON whatsapp_messages(received_at DESC);
CREATE INDEX idx_whatsapp_appointments_phone ON whatsapp_appointments(phone_number);
CREATE INDEX idx_whatsapp_appointments_date ON whatsapp_appointments(appointment_date);