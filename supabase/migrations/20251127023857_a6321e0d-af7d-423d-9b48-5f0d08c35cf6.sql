-- Corrigir RLS dos logs: admins veem tudo, outros veem apenas do seu restaurante
DROP POLICY IF EXISTS "Users can view logs from their restaurants" ON public.system_logs;

CREATE POLICY "Users can view logs from their restaurants or admins see all" 
ON public.system_logs FOR SELECT 
TO authenticated 
USING (
  -- Admin vê tudo
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Outros veem apenas do seu restaurante
  restaurant_id IN (
    SELECT restaurant_id FROM user_restaurants 
    WHERE user_id = auth.uid() AND is_active = true
  )
  OR
  -- Todos podem ver logs órfãos (sem restaurant_id) do próprio user_id
  (restaurant_id IS NULL AND user_id = auth.uid())
);

-- Atualizar logs existentes sem restaurant_id para incluir o correto
UPDATE public.system_logs 
SET restaurant_id = (
  SELECT restaurant_id 
  FROM user_restaurants 
  WHERE user_id = system_logs.user_id 
  AND is_active = true 
  LIMIT 1
)
WHERE restaurant_id IS NULL 
AND user_id IS NOT NULL;