-- Create NFC-e tables structure
CREATE TABLE IF NOT EXISTS public.nfce_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  certificate_type TEXT CHECK (certificate_type IN ('A1', 'A3')),
  certificate_password TEXT,
  certificate_data TEXT,
  certificate_expiry TIMESTAMP WITH TIME ZONE,
  environment TEXT CHECK (environment IN ('test', 'homolog', 'production')) DEFAULT 'test',
  serie_number TEXT DEFAULT '1',
  last_nf_number INTEGER DEFAULT 0,
  cnpj TEXT,
  ie TEXT,
  im TEXT,
  regime_tributario TEXT DEFAULT 'SN',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(restaurant_id)
);

CREATE TABLE IF NOT EXISTS public.nfce_issued (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  nf_number TEXT NOT NULL,
  serie TEXT NOT NULL,
  chave_acesso TEXT,
  xml_content TEXT,
  status TEXT CHECK (status IN ('pending', 'authorized', 'cancelled', 'denied', 'error')) DEFAULT 'pending',
  authorization_date TIMESTAMP WITH TIME ZONE,
  cancellation_date TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  protocol TEXT,
  error_message TEXT,
  total_value DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nfce_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfce_issued ENABLE ROW LEVEL SECURITY;

-- RLS Policies for nfce_settings
CREATE POLICY "Users can view their restaurant nfce_settings"
  ON public.nfce_settings FOR SELECT
  USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Users can update their restaurant nfce_settings"
  ON public.nfce_settings FOR UPDATE
  USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Users can insert their restaurant nfce_settings"
  ON public.nfce_settings FOR INSERT
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());

-- RLS Policies for nfce_issued
CREATE POLICY "Users can view their restaurant nfce_issued"
  ON public.nfce_issued FOR SELECT
  USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Users can insert nfce_issued"
  ON public.nfce_issued FOR INSERT
  WITH CHECK (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Users can update nfce_issued"
  ON public.nfce_issued FOR UPDATE
  USING (restaurant_id = public.get_user_restaurant_id());

-- Indexes
CREATE INDEX idx_nfce_settings_restaurant ON public.nfce_settings(restaurant_id);
CREATE INDEX idx_nfce_issued_restaurant ON public.nfce_issued(restaurant_id);
CREATE INDEX idx_nfce_issued_order ON public.nfce_issued(order_id);
CREATE INDEX idx_nfce_issued_status ON public.nfce_issued(status);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_nfce_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_nfce_settings_updated_at
  BEFORE UPDATE ON public.nfce_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nfce_updated_at();

CREATE TRIGGER update_nfce_issued_updated_at
  BEFORE UPDATE ON public.nfce_issued
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nfce_updated_at();
