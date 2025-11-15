-- Criar função para inicializar subscription em trial ao criar usuário
CREATE OR REPLACE FUNCTION public.initialize_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar subscription em trial automaticamente
  INSERT INTO public.subscriptions (
    user_id,
    plan_type,
    status,
    trial_end
  ) VALUES (
    NEW.id,
    'essencial',
    'trial',
    now() + interval '10 days'
  );
  
  RETURN NEW;
END;
$$;

-- Trigger para inicializar subscription
DROP TRIGGER IF EXISTS on_user_subscription_init ON auth.users;
CREATE TRIGGER on_user_subscription_init
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_subscription();

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription ON public.payment_history(subscription_id);

-- View para facilitar queries de admin
CREATE OR REPLACE VIEW public.admin_subscriptions_view AS
SELECT 
  s.id,
  s.user_id,
  p.full_name as restaurant_name,
  p.phone as restaurant_phone,
  u.email as restaurant_email,
  s.plan_type,
  s.status,
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
    WHEN s.status = 'trial' AND s.trial_end < now() THEN 'expired_trial'
    WHEN s.status = 'trial' AND s.trial_end >= now() THEN 'active_trial'
    WHEN s.status = 'past_due' THEN 'payment_overdue'
    WHEN s.status = 'active' THEN 'active_paid'
    WHEN s.manually_blocked = true THEN 'blocked_manual'
    ELSE s.status
  END as detailed_status,
  CASE
    WHEN s.status = 'trial' THEN EXTRACT(DAY FROM (s.trial_end - now()))::integer
    ELSE NULL
  END as trial_days_left
FROM public.subscriptions s
LEFT JOIN public.profiles p ON p.user_id = s.user_id
LEFT JOIN auth.users u ON u.id = s.user_id;

-- Permitir admin ver a view
CREATE POLICY "Admins can view subscription details"
  ON public.subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Permitir admin gerenciar subscriptions
CREATE POLICY "Admins can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Função para bloquear/desbloquear subscription manualmente
CREATE OR REPLACE FUNCTION public.toggle_subscription_block(
  p_subscription_id UUID,
  p_blocked BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
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