-- Permitir que todos vejam as configurações do restaurante (necessário para o CustomerMenu público)
DROP POLICY IF EXISTS "Staff can view settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.restaurant_settings;

-- Qualquer um pode ver as configurações
CREATE POLICY "Anyone can view restaurant settings"
ON public.restaurant_settings
FOR SELECT
USING (true);

-- Apenas admins podem modificar
CREATE POLICY "Admins can manage restaurant settings"
ON public.restaurant_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));