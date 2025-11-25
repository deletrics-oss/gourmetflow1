-- Fase 3: Corrigir função get_admin_subscriptions com tipos corretos
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
) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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