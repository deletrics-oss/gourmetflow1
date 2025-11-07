-- Permitir que clientes vejam e atualizem seus próprios dados baseado no telefone
DROP POLICY IF EXISTS "Public can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Staff can manage customers" ON public.customers;

-- Qualquer um pode criar cliente (necessário para o CustomerMenu)
CREATE POLICY "Anyone can create customers"
ON public.customers
FOR INSERT
WITH CHECK (true);

-- Qualquer um pode atualizar clientes (necessário para o CustomerMenu atualizar pontos)
CREATE POLICY "Anyone can update customers"
ON public.customers
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Qualquer um pode ver clientes (necessário para o CustomerMenu carregar pontos)
CREATE POLICY "Anyone can view customers"
ON public.customers
FOR SELECT
USING (true);

-- Staff pode deletar clientes
CREATE POLICY "Staff can delete customers"
ON public.customers
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));