-- ============================================
-- FASE 1: Corrigir estrutura do banco de dados
-- ============================================

-- 1.1. Adicionar coluna restaurant_id em restaurant_settings
ALTER TABLE restaurant_settings 
ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id);

-- 1.2. Vincular registro existente (napoli) ao restaurante do Joel
UPDATE restaurant_settings 
SET restaurant_id = 'ba4d9d4c-be2a-49bf-9524-68e9832f973c'
WHERE name = 'napoli' AND restaurant_id IS NULL;

-- 1.3. Criar índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_settings_restaurant_id 
ON restaurant_settings(restaurant_id);

-- 1.4. Vincular TODOS os dados antigos ao restaurante do Joel
UPDATE customers 
SET restaurant_id = 'ba4d9d4c-be2a-49bf-9524-68e9832f973c'
WHERE restaurant_id IS NULL;

UPDATE orders 
SET restaurant_id = 'ba4d9d4c-be2a-49bf-9524-68e9832f973c'
WHERE restaurant_id IS NULL;

UPDATE tables 
SET restaurant_id = 'ba4d9d4c-be2a-49bf-9524-68e9832f973c'
WHERE restaurant_id IS NULL;

UPDATE categories 
SET restaurant_id = 'ba4d9d4c-be2a-49bf-9524-68e9832f973c'
WHERE restaurant_id IS NULL;

UPDATE cash_movements 
SET restaurant_id = 'ba4d9d4c-be2a-49bf-9524-68e9832f973c'
WHERE restaurant_id IS NULL;

UPDATE inventory 
SET restaurant_id = 'ba4d9d4c-be2a-49bf-9524-68e9832f973c'
WHERE restaurant_id IS NULL;

UPDATE motoboys 
SET restaurant_id = 'ba4d9d4c-be2a-49bf-9524-68e9832f973c'
WHERE restaurant_id IS NULL;

UPDATE suppliers 
SET restaurant_id = 'ba4d9d4c-be2a-49bf-9524-68e9832f973c'
WHERE restaurant_id IS NULL;

UPDATE expenses 
SET restaurant_id = 'ba4d9d4c-be2a-49bf-9524-68e9832f973c'
WHERE restaurant_id IS NULL;

UPDATE delivery_zones 
SET restaurant_id = 'ba4d9d4c-be2a-49bf-9524-68e9832f973c'
WHERE restaurant_id IS NULL;

UPDATE system_logs 
SET restaurant_id = 'ba4d9d4c-be2a-49bf-9524-68e9832f973c'
WHERE restaurant_id IS NULL;

-- 1.5. Criar restaurant_settings para restaurantes que não têm
INSERT INTO restaurant_settings (restaurant_id, name)
SELECT r.id, r.name
FROM restaurants r
WHERE r.id NOT IN (
  SELECT restaurant_id FROM restaurant_settings WHERE restaurant_id IS NOT NULL
)
ON CONFLICT DO NOTHING;

-- 1.6. Atualizar trigger para criar restaurant_settings automaticamente
CREATE OR REPLACE FUNCTION public.create_restaurant_and_trial()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_restaurant_id UUID;
  v_restaurant_slug TEXT;
  v_restaurant_name TEXT;
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
  v_restaurant_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Meu Restaurante');
  
  INSERT INTO public.restaurants (
    name,
    slug,
    email,
    owner_user_id,
    is_active
  ) VALUES (
    v_restaurant_name,
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
  
  -- NOVO: Criar configurações vazias para o restaurante
  INSERT INTO public.restaurant_settings (
    restaurant_id,
    name
  ) VALUES (
    v_restaurant_id,
    v_restaurant_name
  );
  
  RETURN NEW;
END;
$function$;

-- 1.7. Atualizar RLS de restaurant_settings
DROP POLICY IF EXISTS "Anyone can view restaurant settings" ON restaurant_settings;
DROP POLICY IF EXISTS "Admins can manage restaurant settings" ON restaurant_settings;

CREATE POLICY "Users can view own restaurant settings"
ON restaurant_settings FOR SELECT
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM user_restaurants 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Owners can manage own restaurant settings"
ON restaurant_settings FOR ALL
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM user_restaurants 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin') 
    AND is_active = true
  )
)
WITH CHECK (
  restaurant_id IN (
    SELECT restaurant_id FROM user_restaurants 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin') 
    AND is_active = true
  )
);