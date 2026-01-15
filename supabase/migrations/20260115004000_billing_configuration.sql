-- =============================================
-- BILLING CONFIGURATION SYSTEM
-- Dynamic plans, trial days, and payment settings
-- =============================================

-- 1. Configuração global de cobrança
CREATE TABLE IF NOT EXISTS public.billing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_days INTEGER DEFAULT 30,
  stripe_enabled BOOLEAN DEFAULT true,
  pix_enabled BOOLEAN DEFAULT false,
  pix_key TEXT,
  pix_beneficiary TEXT,
  pix_bank TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Planos de assinatura configuráveis
CREATE TABLE IF NOT EXISTS public.billing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT UNIQUE NOT NULL, -- 'delivery1', 'delivery2', 'delivery3', 'free'
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  stripe_price_id TEXT,
  features TEXT[] DEFAULT '{}',
  not_included TEXT[] DEFAULT '{}',
  badge TEXT, -- 'Mais Popular', 'Completo', '30 dias grátis'
  is_recommended BOOLEAN DEFAULT false,
  is_trial BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_billing_plans_active ON public.billing_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_billing_plans_key ON public.billing_plans(plan_key);

-- 4. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_billing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_billing_config_updated_at
  BEFORE UPDATE ON public.billing_config
  FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at();

CREATE TRIGGER update_billing_plans_updated_at
  BEFORE UPDATE ON public.billing_plans
  FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at();

-- 5. RLS
ALTER TABLE public.billing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;

-- Políticas: todos podem ler, só admin pode escrever
CREATE POLICY "Anyone can read billing_config" ON public.billing_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage billing_config" ON public.billing_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Anyone can read billing_plans" ON public.billing_plans
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage billing_plans" ON public.billing_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- 6. Inserir configuração padrão
INSERT INTO public.billing_config (trial_days, stripe_enabled, pix_enabled)
VALUES (30, true, false)
ON CONFLICT DO NOTHING;

-- 7. Inserir planos padrão
INSERT INTO public.billing_plans (plan_key, name, price, stripe_price_id, features, not_included, badge, is_trial, sort_order) VALUES
(
  'free',
  'Trial Grátis',
  0,
  NULL,
  ARRAY['Acesso completo por 30 dias', 'Teste todas as funcionalidades', 'Sem cartão de crédito'],
  ARRAY['Após 30 dias, escolha um plano'],
  '30 dias grátis',
  true,
  0
),
(
  'delivery1',
  'Delivery Básico',
  59.99,
  'price_1SXEUNPDGZjTHjxq7tgsf3Uf',
  ARRAY['PDV completo', 'Cardápio online', 'Gestão de clientes', 'Relatórios básicos', 'Delivery integrado', 'Monitor Cozinha', 'Gestão de Motoboys'],
  ARRAY['Gestão de Mesas', 'Comandas', 'Tablet na mesa', 'WhatsApp Bot', 'Design com IA'],
  NULL,
  false,
  1
),
(
  'delivery2',
  'Delivery Pro',
  99.99,
  'price_1SXEUaPDGZjTHjxqqWAYOo0p',
  ARRAY['Tudo do Delivery Básico', 'Gestão de Mesas', 'Comandas físicas', 'Tablet na mesa', 'Totem autoatendimento', 'Relatórios avançados', 'Monitor Gestor'],
  ARRAY['WhatsApp Bot', 'Design com IA', 'Integração iFood/99Food'],
  'Mais Popular',
  false,
  2
),
(
  'delivery3',
  'Delivery Completo',
  159.99,
  'price_1SXEV2PDGZjTHjxqR1Q2CoLF',
  ARRAY['Tudo dos planos anteriores', '🤖 WhatsApp Bot totalmente integrado', '🎨 Geração de design de cardápios com IA', '🍕 Integração iFood', '🛵 Integração 99Food', '📄 NFC-e (Nota Fiscal)', '⭐ Suporte prioritário 24/7'],
  ARRAY[]::TEXT[],
  'Completo',
  false,
  3
)
ON CONFLICT (plan_key) DO NOTHING;
