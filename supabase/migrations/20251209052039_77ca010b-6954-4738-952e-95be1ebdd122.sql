-- Corrigir pedidos com restaurant_id NULL
-- Primeiro, buscar o primeiro restaurante ativo como fallback
DO $$
DECLARE
  v_default_restaurant_id UUID;
BEGIN
  -- Pegar o primeiro restaurante como default
  SELECT id INTO v_default_restaurant_id
  FROM public.restaurants
  WHERE is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  -- Atualizar orders com restaurant_id NULL
  UPDATE public.orders
  SET restaurant_id = v_default_restaurant_id
  WHERE restaurant_id IS NULL
    AND v_default_restaurant_id IS NOT NULL;

  -- Atualizar customers com restaurant_id NULL
  UPDATE public.customers
  SET restaurant_id = v_default_restaurant_id
  WHERE restaurant_id IS NULL
    AND v_default_restaurant_id IS NOT NULL;

  -- Atualizar cash_movements com restaurant_id NULL  
  UPDATE public.cash_movements
  SET restaurant_id = v_default_restaurant_id
  WHERE restaurant_id IS NULL
    AND v_default_restaurant_id IS NOT NULL;
    
  -- Atualizar tables com restaurant_id NULL
  UPDATE public.tables
  SET restaurant_id = v_default_restaurant_id
  WHERE restaurant_id IS NULL
    AND v_default_restaurant_id IS NOT NULL;

  -- Atualizar categories com restaurant_id NULL
  UPDATE public.categories
  SET restaurant_id = v_default_restaurant_id
  WHERE restaurant_id IS NULL
    AND v_default_restaurant_id IS NOT NULL;

  -- Atualizar menu_items com restaurant_id NULL
  UPDATE public.menu_items
  SET restaurant_id = v_default_restaurant_id
  WHERE restaurant_id IS NULL
    AND v_default_restaurant_id IS NOT NULL;

  -- Atualizar motoboys com restaurant_id NULL
  UPDATE public.motoboys
  SET restaurant_id = v_default_restaurant_id
  WHERE restaurant_id IS NULL
    AND v_default_restaurant_id IS NOT NULL;
END $$;