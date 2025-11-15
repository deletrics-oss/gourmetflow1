-- Tabela de assinaturas dos restaurantes
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('essencial', 'essencial_mesas', 'customizado')),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'past_due', 'canceled', 'trial', 'pending')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '10 days'),
  cancel_at_period_end BOOLEAN DEFAULT false,
  manually_blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de funcionalidades dos planos
CREATE TABLE public.plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(plan_type, feature_key)
);

-- Tabela de histórico de pagamentos
CREATE TABLE public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  stripe_payment_id TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Policies para subscriptions
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Policies para plan_features
CREATE POLICY "Anyone can view plan features"
  ON public.plan_features FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage plan features"
  ON public.plan_features FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Policies para payment_history
CREATE POLICY "Users can view own payment history"
  ON public.payment_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE subscriptions.id = payment_history.subscription_id
      AND subscriptions.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payment history"
  ON public.payment_history FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir funcionalidades dos planos
INSERT INTO public.plan_features (plan_type, feature_key, enabled) VALUES
-- Plano Essencial
('essencial', 'pedidos_online', true),
('essencial', 'pedidos_balcao', true),
('essencial', 'cardapio', true),
('essencial', 'clientes', true),
('essencial', 'relatorios_basicos', true),
('essencial', 'integracao_ifood', true),
('essencial', 'integracao_99food', true),
('essencial', 'integracao_keeta', true),
('essencial', 'mesas', false),
('essencial', 'comandas', false),
('essencial', 'nfce', false),
('essencial', 'zapbot', false),

-- Plano Essencial + Mesas
('essencial_mesas', 'pedidos_online', true),
('essencial_mesas', 'pedidos_balcao', true),
('essencial_mesas', 'cardapio', true),
('essencial_mesas', 'clientes', true),
('essencial_mesas', 'relatorios_basicos', true),
('essencial_mesas', 'integracao_ifood', true),
('essencial_mesas', 'integracao_99food', true),
('essencial_mesas', 'integracao_keeta', true),
('essencial_mesas', 'mesas', true),
('essencial_mesas', 'comandas', true),
('essencial_mesas', 'nfce', false),
('essencial_mesas', 'zapbot', false),

-- Plano Customizado
('customizado', 'pedidos_online', true),
('customizado', 'pedidos_balcao', true),
('customizado', 'cardapio', true),
('customizado', 'clientes', true),
('customizado', 'relatorios_basicos', true),
('customizado', 'integracao_ifood', true),
('customizado', 'integracao_99food', true),
('customizado', 'integracao_keeta', true),
('customizado', 'mesas', true),
('customizado', 'comandas', true),
('customizado', 'nfce', true),
('customizado', 'zapbot', true),
('customizado', 'relatorios_avancados', true),
('customizado', 'suporte_prioritario', true);