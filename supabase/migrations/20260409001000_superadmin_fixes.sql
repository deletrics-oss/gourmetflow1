-- GOURMETFLOW: CORREÇÕES E MELHORIAS SUPER ADMIN
-- Objetivo: Restaurar visão global, emails de usuários e gestão de assinaturas.

BEGIN;

-- 1. FUNÇÃO PARA BUSCAR EMAILS (SECURITY DEFINER permite ver auth.users)
CREATE OR REPLACE FUNCTION public.get_admin_users_v2()
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    restaurant_name TEXT,
    restaurant_id UUID,
    plan_type TEXT,
    status TEXT,
    trial_end TIMESTAMP WITH TIME ZONE,
    manually_blocked BOOLEAN
) 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email::TEXT,
        p.full_name,
        p.phone,
        u.created_at,
        r.name as restaurant_name,
        r.id as restaurant_id,
        s.plan_type,
        s.status,
        s.trial_end,
        s.manually_blocked
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.user_id
    LEFT JOIN public.user_restaurants ur ON u.id = ur.user_id AND ur.is_active = true
    LEFT JOIN public.restaurants r ON ur.restaurant_id = r.id
    LEFT JOIN public.subscriptions s ON u.id = s.user_id
    ORDER BY u.created_at DESC;
END;
$$;

-- 2. POLÍTICAS DE RLS PARA SUPER ADMIN (Dando a "Chave Mestra")

-- Política para RESTAURANTS (Super Admin vê todos)
DROP POLICY IF EXISTS "Super Admin can view all restaurants" ON public.restaurants;
CREATE POLICY "Super Admin can view all restaurants" ON public.restaurants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Política para ORDERS (Super Admin vê todos para faturamento global)
DROP POLICY IF EXISTS "Super Admin can view all orders" ON public.orders;
CREATE POLICY "Super Admin can view all orders" ON public.orders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Política para SUBSCRIPTIONS (Super Admin vê todos)
DROP POLICY IF EXISTS "Super Admin can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Super Admin can view all subscriptions" ON public.subscriptions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Política para USER_RESTAURANTS (Super Admin vê todos)
DROP POLICY IF EXISTS "Super Admin can view all user_restaurants" ON public.user_restaurants;
CREATE POLICY "Super Admin can view all user_restaurants" ON public.user_restaurants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 3. GARANTIR QUE NOVOS RESTAURANTES NASÇAM ATIVOS
-- Ajuste no trigger de criação (caso ele tenha sido sobrescrito)
CREATE OR REPLACE FUNCTION public.create_restaurant_and_trial()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_restaurant_id UUID;
  v_restaurant_slug TEXT;
BEGIN
  v_restaurant_slug := 'rest-' || substring(md5(NEW.id::text) from 1 for 8);
  
  INSERT INTO public.restaurants (
    name, slug, email, owner_user_id, is_active
  ) VALUES (
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Meu Restaurante'),
    v_restaurant_slug,
    NEW.email,
    NEW.id,
    true
  ) RETURNING id INTO v_restaurant_id;
  
  INSERT INTO public.user_restaurants (
    user_id, restaurant_id, role, is_active
  ) VALUES (
    NEW.id, v_restaurant_id, 'owner', true
  );
  
  -- Trial de 30 dias
  INSERT INTO public.subscriptions (
    user_id, plan_type, status, trial_end
  ) VALUES (
    NEW.id, 'essencial', 'trial', now() + interval '30 days'
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 4. FUNÇÃO PARA ALTERAR SENHA MANUALMENTE (SUPER ADMIN)
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(p_user_id UUID, p_new_password TEXT)
RETURNS VOID
SECURITY DEFINER
SET search_path = auth, public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar se quem está chamando é admin
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem alterar senhas.';
  END IF;

  -- Atualizar a senha no sistema de autenticação do Supabase
  UPDATE auth.users 
  SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

COMMIT;
