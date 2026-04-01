-- ============================================
-- STRICT TENANT ISOLATION REINSTATEMENT
-- Removes wide-open policies and enforces restaurant_id checks
-- Run this in Supabase SQL Editor for the new project
-- ============================================

-- 1. Drop the dangerous _all policies inserted by 20260116012900_comprehensive_rls_fix.sql
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND policyname LIKE '%_all'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 2. Secure the `restaurants` table itself
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "restaurants_isolation" ON public.restaurants;
CREATE POLICY "restaurants_isolation" ON public.restaurants
FOR ALL TO authenticated
USING (
    owner_user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.user_restaurants ur WHERE ur.restaurant_id = id AND ur.user_id = auth.uid() AND ur.is_active = true)
);

-- 3. Secure the `user_restaurants` table
ALTER TABLE public.user_restaurants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_restaurants_isolation" ON public.user_restaurants;
CREATE POLICY "user_restaurants_isolation" ON public.user_restaurants
FOR ALL TO authenticated
USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = restaurant_id AND r.owner_user_id = auth.uid())
);

-- 4. Secure all other tables that have a `restaurant_id` column
DO $$ 
DECLARE
    target_table TEXT;
BEGIN
    FOR target_table IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name = 'restaurant_id' 
        AND table_name NOT IN ('user_restaurants', 'restaurants')
    LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', target_table);
        
        -- Drop any potential colliding isolation policies
        EXECUTE format('DROP POLICY IF EXISTS "%s_isolation" ON public.%I;', target_table, target_table);
        
        -- Create strictly isolated policy for authenticated tenants
        EXECUTE format('
            CREATE POLICY "%s_isolation" ON public.%I
            FOR ALL TO authenticated
            USING (
                restaurant_id IN (
                    SELECT restaurant_id FROM public.user_restaurants WHERE user_id = auth.uid() AND is_active = true
                ) OR 
                restaurant_id IN (
                    SELECT id FROM public.restaurants WHERE owner_user_id = auth.uid()
                ) OR
                -- Caso especial: permite visualizar/inserir registros globais (restaurant_id nulo) se for da tabela customers
                (restaurant_id IS NULL AND ''%I'' = ''customers'')
            );
        ', target_table, target_table, target_table);
    END LOOP;
END $$;
