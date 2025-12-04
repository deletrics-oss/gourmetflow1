-- Modificar trigger para distinguir inquilinos de funcionários
CREATE OR REPLACE FUNCTION public.create_restaurant_and_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_restaurant_id UUID;
  v_restaurant_slug TEXT;
  v_invited_restaurant_id UUID;
  v_invited_role TEXT;
BEGIN
  -- Verificar se o usuário foi convidado por um restaurante existente
  v_invited_restaurant_id := (NEW.raw_user_meta_data->>'invited_by_restaurant')::uuid;
  v_invited_role := COALESCE(NEW.raw_user_meta_data->>'invited_role', 'staff');
  
  IF v_invited_restaurant_id IS NOT NULL THEN
    -- FUNCIONÁRIO: Apenas associar ao restaurante existente (não criar novo)
    INSERT INTO public.user_restaurants (
      user_id,
      restaurant_id,
      role,
      is_active
    ) VALUES (
      NEW.id,
      v_invited_restaurant_id,
      v_invited_role,
      true
    );
    
    -- Não criar subscription para funcionários (eles usam a do dono)
    RETURN NEW;
  END IF;
  
  -- INQUILINO: Criar novo restaurante para este usuário
  v_restaurant_slug := 'rest-' || substring(md5(NEW.id::text) from 1 for 8);
  
  INSERT INTO public.restaurants (
    name,
    slug,
    email,
    owner_user_id,
    is_active
  ) VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Meu Restaurante'),
    v_restaurant_slug,
    NEW.email,
    NEW.id,
    true
  ) RETURNING id INTO v_restaurant_id;
  
  -- Associar usuário como owner do restaurante
  INSERT INTO public.user_restaurants (
    user_id,
    restaurant_id,
    role,
    is_active
  ) VALUES (
    NEW.id,
    v_restaurant_id,
    'owner',
    true
  );
  
  RETURN NEW;
END;
$$;

-- Criar função para convidar funcionários via edge function ou RPC
CREATE OR REPLACE FUNCTION public.invite_employee(
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'staff',
  p_restaurant_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_restaurant_id UUID;
BEGIN
  -- Se não passou restaurant_id, usar o do usuário atual
  IF p_restaurant_id IS NULL THEN
    SELECT restaurant_id INTO v_restaurant_id
    FROM public.user_restaurants
    WHERE user_id = auth.uid()
      AND is_active = true
      AND role IN ('owner', 'admin')
    ORDER BY created_at ASC
    LIMIT 1;
  ELSE
    v_restaurant_id := p_restaurant_id;
  END IF;
  
  IF v_restaurant_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Restaurante não encontrado ou sem permissão');
  END IF;
  
  -- Retornar dados para criar o usuário via auth.signUp com metadata
  RETURN json_build_object(
    'success', true,
    'restaurant_id', v_restaurant_id,
    'metadata', json_build_object(
      'full_name', p_full_name,
      'invited_by_restaurant', v_restaurant_id,
      'invited_role', p_role
    )
  );
END;
$$;