-- Corrigir funções sem search_path definido

-- Recriar get_user_restaurant_id com search_path
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_restaurant_id UUID;
BEGIN
  SELECT restaurant_id INTO v_restaurant_id
  FROM public.user_restaurants
  WHERE user_id = auth.uid()
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN v_restaurant_id;
END;
$$;

-- Recriar log_action com search_path
CREATE OR REPLACE FUNCTION public.log_action(
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log_id UUID;
  v_restaurant_id UUID;
BEGIN
  v_restaurant_id := public.get_user_restaurant_id();
  
  INSERT INTO public.system_logs (
    restaurant_id,
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_restaurant_id,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_details
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;