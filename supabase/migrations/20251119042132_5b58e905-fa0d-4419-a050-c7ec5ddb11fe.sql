-- Modificar função log_action para funcionar sem autenticação
CREATE OR REPLACE FUNCTION public.log_action(
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_restaurant_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log_id UUID;
  v_restaurant_id UUID;
  v_user_id UUID;
BEGIN
  -- Obter user_id (pode ser NULL para vendas públicas)
  v_user_id := auth.uid();
  
  -- Usar p_restaurant_id se fornecido, senão tentar pegar do usuário
  IF p_restaurant_id IS NOT NULL THEN
    v_restaurant_id := p_restaurant_id;
  ELSE
    v_restaurant_id := public.get_user_restaurant_id();
  END IF;
  
  -- Inserir log (user_id e restaurant_id podem ser NULL)
  INSERT INTO public.system_logs (
    restaurant_id,
    user_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    v_restaurant_id,
    v_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_details
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;