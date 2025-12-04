-- Fix initialize_user_subscription to use valid plan_type
CREATE OR REPLACE FUNCTION public.initialize_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create subscription with 30-day trial using valid plan_type
  INSERT INTO public.subscriptions (
    user_id,
    plan_type,
    status,
    trial_end
  ) VALUES (
    NEW.id,
    'essencial',
    'trial',
    now() + interval '30 days'
  );
  
  RETURN NEW;
END;
$$;