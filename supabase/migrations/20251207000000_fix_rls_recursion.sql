-- ============================================
-- FIX: BREAK CIRCULAR RLS DEPENDENCY
-- ============================================

-- 1. Simplificar user_restaurants: Usuário sempre vê suas próprias vinculações
DROP POLICY IF EXISTS "user_restaurants_isolation" ON public.user_restaurants;
CREATE POLICY "user_restaurants_isolation" ON public.user_restaurants
FOR ALL TO authenticated
USING (user_id = auth.uid());

-- 2. Simplificar restaurants: Dono vê seu restaurante, ou quem tem vínculo ativo (sem recursão profunda)
DROP POLICY IF EXISTS "restaurants_isolation" ON public.restaurants;
CREATE POLICY "restaurants_isolation" ON public.restaurants
FOR ALL TO authenticated
USING (
    owner_user_id = auth.uid() OR 
    id IN (
        SELECT restaurant_id FROM public.user_restaurants 
        WHERE user_id = auth.uid() AND is_active = true
    )
);

-- 3. Garantir que outras tabelas não entrem em loop
-- As tabelas que usam (restaurant_id IN (SELECT restaurant_id FROM user_restaurants ...)) 
-- agora vão funcionar porque a política da user_restaurants é direta (user_id = auth.uid()).
