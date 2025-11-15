-- Corrigir warnings de segurança

-- Remover a view admin_subscriptions_view e criar como função
DROP VIEW IF EXISTS public.admin_subscriptions_view;

-- Criar função segura para admin obter subscriptions
CREATE OR REPLACE FUNCTION public.get_admin_subscriptions()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  restaurant_name TEXT,
  restaurant_phone TEXT,
  restaurant_email TEXT,
  plan_type TEXT,
  status TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  manually_blocked BOOLEAN,
  blocked_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  detailed_status TEXT,
  trial_days_left INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário é admin
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
  LEFT JOIN auth.users u ON u.id = s.user_id
  ORDER BY s.created_at DESC;
END;
$$;

-- Função para obter histórico de pagamentos de uma subscription
CREATE OR REPLACE FUNCTION public.get_subscription_payments(p_subscription_id UUID)
RETURNS TABLE (
  id UUID,
  stripe_payment_id TEXT,
  amount NUMERIC,
  currency TEXT,
  status TEXT,
  payment_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário é admin ou dono da subscription
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